import { Router } from 'express';
import { db } from './db';
import { appointments, conversations, services, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * Get appointment details for a conversation
 * GET /api/conversations/:conversationId/appointment
 */
router.get('/conversations/:conversationId/appointment', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    
    // Get conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    
    if (!conversation || !conversation.appointmentId) {
      return res.json({ success: true, appointment: null });
    }
    
    // Get appointment
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, conversation.appointmentId));
    
    if (!appointment) {
      return res.json({ success: true, appointment: null });
    }
    
    // Get service details
    const [service] = await db.select()
      .from(services)
      .where(eq(services.id, appointment.serviceId));
    
    // Get customer details
    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.id, appointment.customerId));
    
    res.json({ 
      success: true, 
      appointment: {
        ...appointment,
        service,
        customer,
      }
    });
  } catch (error) {
    console.error('[GET appointment] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointment' });
  }
});

/**
 * Create or update appointment for a conversation
 * POST /api/conversations/:conversationId/appointment
 */
router.post('/conversations/:conversationId/appointment', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    
    // Validate request body
    const schema = z.object({
      customerId: z.number(),
      serviceId: z.number(),
      scheduledTime: z.string().transform(str => new Date(str)),
      address: z.string(),
      additionalRequests: z.array(z.string()).optional(),
      addOns: z.any().optional(),
    });
    
    const data = schema.parse(req.body);
    
    // Get conversation to check if appointment already exists
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    let appointmentId: number;
    
    if (conversation.appointmentId) {
      // Update existing appointment
      await db.update(appointments)
        .set({
          serviceId: data.serviceId,
          scheduledTime: data.scheduledTime,
          address: data.address,
          additionalRequests: data.additionalRequests,
          addOns: data.addOns,
        })
        .where(eq(appointments.id, conversation.appointmentId));
      
      appointmentId = conversation.appointmentId;
    } else {
      // Create new appointment
      const [newAppointment] = await db.insert(appointments)
        .values({
          customerId: data.customerId,
          serviceId: data.serviceId,
          scheduledTime: data.scheduledTime,
          address: data.address,
          additionalRequests: data.additionalRequests,
          addOns: data.addOns,
        })
        .returning();
      
      appointmentId = newAppointment.id;
      
      // Link appointment to conversation
      await db.update(conversations)
        .set({ appointmentId })
        .where(eq(conversations.id, conversationId));
    }
    
    // Fetch updated appointment
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    
    // Get service details
    const [service] = await db.select()
      .from(services)
      .where(eq(services.id, appointment.serviceId));
    
    // Get customer details
    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.id, appointment.customerId));
    
    res.json({ 
      success: true, 
      appointment: {
        ...appointment,
        service,
        customer,
      }
    });
  } catch (error) {
    console.error('[POST appointment] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to save appointment' });
  }
});

/**
 * Delete appointment from conversation
 * DELETE /api/conversations/:conversationId/appointment
 */
router.delete('/conversations/:conversationId/appointment', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);
    
    // Get conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    
    if (!conversation || !conversation.appointmentId) {
      return res.json({ success: true });
    }
    
    // Remove appointment reference from conversation
    await db.update(conversations)
      .set({ appointmentId: null })
      .where(eq(conversations.id, conversationId));
    
    // Optionally delete the appointment itself
    // await db.delete(appointments).where(eq(appointments.id, conversation.appointmentId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE appointment] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete appointment' });
  }
});

export default router;
