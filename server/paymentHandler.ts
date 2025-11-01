import Stripe from 'stripe';
import { Request, Response } from 'express';
import { db } from './db';
import { invoices } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendInvoiceNotification } from './invoiceService';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Create a Stripe payment intent for an invoice
 */
export async function createStripePaymentIntent(req: Request, res: Response) {
  try {
    const { invoiceId } = req.params;
    
    // Fetch the invoice details
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parseInt(invoiceId)));
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // If already paid, return an error
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }
    
    // Convert amount to cents (Stripe works with smallest currency unit)
    const amountInCents = Math.round(Number(invoice.amount) * 100);
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        invoiceId: invoiceId,
      },
    });
    
    // Update the invoice with the payment intent ID
    await db
      .update(invoices)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(invoices.id, parseInt(invoiceId)));
    
    // Return the client secret to the client
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      invoiceDetails: {
        id: invoice.id,
        amount: invoice.amount,
        description: invoice.serviceDescription,
        status: invoice.status,
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET is not set, skipping signature verification');
  }
  
  let event;
  
  try {
    // Verify webhook signature if secret is set
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // If no webhook secret, parse the body directly (less secure)
      event = req.body;
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata.invoiceId;
        
        // Update invoice status
        await db
          .update(invoices)
          .set({
            status: 'paid',
            paymentMethod: 'stripe',
            paidAt: new Date(),
          })
          .where(eq(invoices.id, parseInt(invoiceId)));
        
        console.log(`Invoice ${invoiceId} marked as paid via Stripe`);
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

/**
 * Mark an invoice as paid with a non-Stripe payment method
 */
export async function markInvoiceAsPaid(req: Request, res: Response) {
  try {
    const { invoiceId } = req.params;
    const { paymentMethod } = req.body;
    
    if (!paymentMethod || !['venmo', 'cashapp', 'paypal', 'cash', 'check'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Update the invoice
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: 'paid',
        paymentMethod,
        paidAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(invoiceId)))
      .returning();
    
    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.status(200).json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
}

/**
 * Get payment details and options for an invoice
 */
export async function getPaymentDetails(req: Request, res: Response) {
  try {
    const { invoiceId } = req.params;
    
    // Fetch the invoice with customer details
    const [invoiceData] = await db.execute(`
      SELECT 
        i.id, i.amount, i.service_description, i.status, i.payment_method,
        c.name as customer_name, c.phone as customer_phone
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoiceId]);
    
    if (!invoiceData || invoiceData.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Format payment options
    const paymentOptions = {
      stripe: {
        name: 'Credit/Debit Card',
        url: `/pay/${invoiceId}`,
      },
      venmo: {
        name: 'Venmo',
        account: process.env.VENMO_USERNAME || '@cleanmachinetulsa',
      },
      cashapp: {
        name: 'CashApp',
        account: process.env.CASHAPP_USERNAME || '$CleanMachineTulsa',
      },
      paypal: {
        name: 'PayPal',
        account: 'CleanMachineTulsa',
      },
    };
    
    res.status(200).json({
      invoice: invoiceData[0],
      paymentOptions,
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({ error: 'Failed to get payment details' });
  }
}

/**
 * Send a payment reminder for unpaid invoices
 */
export async function sendPaymentReminder(req: Request, res: Response) {
  try {
    const { invoiceId } = req.params;
    
    // Check if invoice exists and is unpaid
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, parseInt(invoiceId)));
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }
    
    // Send notification
    const success = await sendInvoiceNotification(invoice.id, 'both');
    
    if (success) {
      res.status(200).json({ success: true, message: 'Payment reminder sent' });
    } else {
      res.status(500).json({ error: 'Failed to send payment reminder' });
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    res.status(500).json({ error: 'Failed to send payment reminder' });
  }
}