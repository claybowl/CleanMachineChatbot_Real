import { db } from './db';
import { invoices, appointments, customers, services, type Invoice, type InsertInvoice } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { sendEmail } from './emailService';
import { sendSMS } from './notifications';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Create an invoice for a completed appointment
 */
export async function createInvoice(appointmentId: number): Promise<Invoice> {
  // Get appointment details with customer and service info
  const [appointmentWithDetails] = await db
    .select({
      appointment: appointments,
      customer: customers,
      service: services,
    })
    .from(appointments)
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.id, appointmentId));

  if (!appointmentWithDetails) {
    throw new Error(`Appointment with ID ${appointmentId} not found`);
  }

  const { appointment, customer, service } = appointmentWithDetails;

  // Parse the price range to get a specific amount
  // Format is typically "$X - $Y" or "$Z"
  const priceText = service.priceRange;
  const priceMatch = priceText.match(/\$(\d+)(?:\s*-\s*\$(\d+))?/);
  
  let amount;
  if (priceMatch) {
    if (priceMatch[2]) {
      // If there's a range, use the higher value
      amount = parseFloat(priceMatch[2]);
    } else {
      // If there's a single value
      amount = parseFloat(priceMatch[1]);
    }
  } else {
    // Fallback if we can't parse the price
    amount = 0;
  }

  // Create service description
  const serviceDescription = `${service.name} - ${service.description}`;

  // Create the invoice
  const newInvoice: InsertInvoice = {
    appointmentId,
    customerId: customer.id,
    amount,
    serviceDescription,
    notes: `Service completed at ${customer.address || appointment.address}`,
  };

  const [invoice] = await db
    .insert(invoices)
    .values(newInvoice)
    .returning();

  return invoice;
}

/**
 * Get invoice details by ID
 */
export async function getInvoice(invoiceId: number): Promise<Invoice | undefined> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  
  return invoice;
}

/**
 * Create a Stripe payment intent for an invoice
 */
export async function createStripePaymentIntent(invoiceId: number): Promise<string> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice with ID ${invoiceId} not found`);
  }

  const amountInCents = Math.round(Number(invoice.amount) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    metadata: {
      invoiceId: invoice.id.toString(),
    },
  });

  // Update the invoice with the payment intent ID
  await db
    .update(invoices)
    .set({ stripePaymentIntentId: paymentIntent.id })
    .where(eq(invoices.id, invoiceId));

  return paymentIntent.client_secret as string;
}

/**
 * Update invoice payment status
 */
export async function updateInvoicePaymentStatus(
  invoiceId: number,
  status: 'paid' | 'unpaid',
  paymentMethod?: string
): Promise<Invoice> {
  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      status,
      paymentMethod,
      paidAt: status === 'paid' ? new Date() : null,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updatedInvoice;
}

/**
 * Mark an appointment as completed and generate an invoice
 */
export async function completeAppointmentAndGenerateInvoice(
  appointmentId: number
): Promise<Invoice> {
  // First mark the appointment as completed
  await db
    .update(appointments)
    .set({ completed: true })
    .where(eq(appointments.id, appointmentId));

  // Then create and return the invoice
  return createInvoice(appointmentId);
}

/**
 * Send invoice notification to customer
 */
export async function sendInvoiceNotification(
  invoiceId: number,
  platform: 'sms' | 'email' | 'both'
): Promise<boolean> {
  // Get invoice with customer and appointment details
  const [invoiceDetails] = await db
    .select({
      invoice: invoices,
      customer: customers,
      appointment: appointments,
      service: services,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(appointments, eq(invoices.appointmentId, appointments.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(invoices.id, invoiceId));

  if (!invoiceDetails) {
    throw new Error('Invoice details not found');
  }

  const { invoice, customer, service } = invoiceDetails;
  
  // Construct payment options message
  const paymentOptions = `
Payment Options:
1. Card Payment via Stripe: ${process.env.CLIENT_BASE_URL || 'https://cleanmachine-detailer.replit.app'}/pay/${invoice.id}
2. Venmo: ${process.env.VENMO_USERNAME || '@cleanmachinetulsa'}
3. CashApp: ${process.env.CASHAPP_USERNAME || '$CleanMachineTulsa'}
4. PayPal: CleanMachineTulsa
`;

  // Build messages based on platform
  let success = true;

  if (platform === 'sms' || platform === 'both') {
    // SMS version - concise but warm
    const smsMessage = `Thank you for choosing Clean Machine Auto Detail! 
Your ${service.name} service is complete.
Amount due: $${invoice.amount}

${paymentOptions}

We'd love to hear your feedback! Please leave a review:
Google: https://g.page/r/CQo53O2yXrN8EBM/review
Facebook: https://www.facebook.com/CLEANMACHINETULSA

Thanks for trusting us with your vehicle!`;

    try {
      await sendSMS({
        to: customer.phone,
        body: smsMessage,
      });
    } catch (error) {
      console.error('Error sending SMS invoice notification:', error);
      success = false;
    }
  }

  if (platform === 'email' || platform === 'both') {
    if (customer.email) {
      // Email version - more formatted and detailed
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a90e2;">Thank You!</h1>
            <p style="font-size: 18px;">Your vehicle has been detailed with care.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #333;">Service Details</h2>
            <p><strong>Service:</strong> ${service.name}</p>
            <p><strong>Description:</strong> ${service.description}</p>
            <p><strong>Amount Due:</strong> $${invoice.amount}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h2 style="color: #333;">Payment Options</h2>
            <p><strong>1. Card Payment:</strong> <a href="${process.env.CLIENT_BASE_URL || 'https://cleanmachine-detailer.replit.app'}/pay/${invoice.id}" style="color: #4a90e2;">Pay Online</a></p>
            <p><strong>2. Venmo:</strong> ${process.env.VENMO_USERNAME || '@cleanmachinetulsa'}</p>
            <p><strong>3. CashApp:</strong> ${process.env.CASHAPP_USERNAME || '$CleanMachineTulsa'}</p>
            <p><strong>4. PayPal:</strong> CleanMachineTulsa</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #333;">We Value Your Feedback</h2>
            <p>Please consider leaving a review:</p>
            <p><a href="https://g.page/r/CQo53O2yXrN8EBM/review" style="display: inline-block; background-color: #4285f4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Google Review</a>
            <a href="https://www.facebook.com/CLEANMACHINETULSA" style="display: inline-block; background-color: #3b5998; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Facebook Review</a></p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eaeaea;">
            <p>Thank you for trusting Clean Machine Auto Detail with your vehicle!</p>
            <p style="color: #888; font-size: 12px;">© ${new Date().getFullYear()} Clean Machine Auto Detail</p>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          to: customer.email,
          subject: 'Clean Machine Auto Detail - Service Complete',
          html: emailHtml,
        });
      } catch (error) {
        console.error('Error sending email invoice notification:', error);
        success = false;
      }
    }
  }

  return success;
}

/**
 * Send a review request 2 days after the service
 */
export async function sendReviewRequest(invoiceId: number): Promise<boolean> {
  const [invoiceDetails] = await db
    .select({
      invoice: invoices,
      customer: customers,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(
      eq(invoices.id, invoiceId),
      eq(invoices.reviewRequestSent, false)
    ));

  if (!invoiceDetails) {
    return false;
  }

  const { invoice, customer } = invoiceDetails;

  // SMS review request - warm and conversational
  const smsMessage = `Hi ${customer.name || 'there'}! It's been a couple days since we detailed your vehicle. How is everything looking? We'd love to hear your feedback!

If you're happy with our service, please consider leaving a review:
Google: https://g.page/r/CQo53O2yXrN8EBM/review
Facebook: https://www.facebook.com/CLEANMACHINETULSA

Thank you for choosing Clean Machine Auto Detail!`;

  try {
    await sendSMS({
      to: customer.phone,
      body: smsMessage,
    });

    // Mark review request as sent
    await db
      .update(invoices)
      .set({ reviewRequestSent: true })
      .where(eq(invoices.id, invoiceId));

    return true;
  } catch (error) {
    console.error('Error sending review request:', error);
    return false;
  }
}

/**
 * Get all unpaid invoices
 */
export async function getUnpaidInvoices(): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.status, 'unpaid'));
}

/**
 * Get all invoices for a customer
 */
export async function getCustomerInvoices(customerId: number): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, customerId));
}