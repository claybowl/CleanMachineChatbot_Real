import { db } from './db';
import { conversations, messages, customers } from '@shared/schema';
import { eq, desc, and, sql, or } from 'drizzle-orm';
import {
  broadcastNewMessage,
  broadcastConversationUpdate,
  broadcastNewConversation,
  broadcastControlModeChange,
  broadcastBehaviorUpdate,
} from './websocketService';

/**
 * Get all active conversations with customer info and latest message
 */
export async function getAllConversations(status?: string) {
  try {
    const statusFilter = status || 'all';
    
    // Build the where clause based on filter
    let whereClause;
    if (statusFilter === 'all') {
      // Show all active conversations
      whereClause = eq(conversations.status, 'active');
    } else if (statusFilter === 'manual') {
      // Show conversations in manual mode (still active)
      whereClause = and(
        eq(conversations.status, 'active'),
        eq(conversations.controlMode, 'manual')
      );
    } else if (statusFilter === 'closed') {
      // Show closed conversations
      whereClause = eq(conversations.status, 'closed');
    } else {
      // Fallback to active
      whereClause = eq(conversations.status, 'active');
    }
    
    const conversationList = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        customerPhone: conversations.customerPhone,
        customerName: conversations.customerName,
        category: conversations.category,
        intent: conversations.intent,
        needsHumanAttention: conversations.needsHumanAttention,
        resolved: conversations.resolved,
        lastMessageTime: conversations.lastMessageTime,
        platform: conversations.platform,
        controlMode: conversations.controlMode,
        assignedAgent: conversations.assignedAgent,
        behaviorSettings: conversations.behaviorSettings,
        status: conversations.status,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(whereClause)
      .orderBy(desc(conversations.lastMessageTime));

    // Get message counts for each conversation
    const conversationsWithCounts = await Promise.all(
      conversationList.map(async (conv) => {
        const messageCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.conversationId, conv.id));

        const latestMessage = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.timestamp))
          .limit(1);

        return {
          ...conv,
          messageCount: Number(messageCount[0]?.count || 0),
          latestMessage: latestMessage[0] || null,
        };
      })
    );

    return conversationsWithCounts;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
}

/**
 * Get conversation by ID with full message history
 */
export async function getConversationById(conversationId: number) {
  try {
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation || conversation.length === 0) {
      return null;
    }

    const messageHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    return {
      ...conversation[0],
      messages: messageHistory,
    };
  } catch (error) {
    console.error('Error getting conversation by ID:', error);
    throw error;
  }
}

/**
 * Create or get conversation for a customer
 */
export async function getOrCreateConversation(
  customerPhone: string,
  customerName: string | null,
  platform: 'web' | 'sms'
) {
  try {
    // Check if there's an active conversation for this phone
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.customerPhone, customerPhone),
          eq(conversations.status, 'active')
        )
      )
      .limit(1);

    if (existingConversation && existingConversation.length > 0) {
      return existingConversation[0];
    }

    // Try to find customer ID by phone
    let customerId: number | null = null;
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, customerPhone))
      .limit(1);

    if (customer && customer.length > 0) {
      customerId = customer[0].id;
    }

    // Create new conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        customerId,
        customerPhone,
        customerName,
        platform,
        controlMode: 'auto',
        status: 'active',
        category: 'Other',
        intent: 'Information Gathering',
        needsHumanAttention: false,
        resolved: false,
      })
      .returning();

    // Broadcast new conversation to monitoring dashboard
    broadcastNewConversation(newConversation[0]);

    return newConversation[0];
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
}

/**
 * Add message to conversation
 */
export async function addMessage(
  conversationId: number,
  content: string,
  sender: 'customer' | 'ai' | 'agent',
  channel: 'web' | 'sms'
) {
  try {
    const newMessage = await db.insert(messages).values({
      conversationId,
      content,
      sender,
      fromCustomer: sender === 'customer',
      channel,
    }).returning();

    // Update conversation's last message time
    await db
      .update(conversations)
      .set({ lastMessageTime: new Date() })
      .where(eq(conversations.id, conversationId));

    // Broadcast new message to monitoring dashboard
    broadcastNewMessage(conversationId, newMessage[0]);

    return newMessage[0];
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Take over conversation (switch to manual mode)
 */
export async function takeoverConversation(
  conversationId: number,
  agentUsername: string
) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        controlMode: 'manual',
        assignedAgent: agentUsername,
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast control mode change
    broadcastControlModeChange(conversationId, 'manual', agentUsername);
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error taking over conversation:', error);
    throw error;
  }
}

/**
 * Hand off conversation back to AI
 */
export async function handoffConversation(conversationId: number) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        controlMode: 'auto',
        assignedAgent: null,
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast control mode change
    broadcastControlModeChange(conversationId, 'auto', null);
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error handing off conversation:', error);
    throw error;
  }
}

/**
 * Update conversation behavior settings
 */
export async function updateBehaviorSettings(
  conversationId: number,
  behaviorSettings: {
    tone?: string;
    forcedAction?: string;
    formality?: number;
    responseLength?: number;
    proactivity?: number;
  }
) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        behaviorSettings: behaviorSettings as any,
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast behavior update
    broadcastBehaviorUpdate(conversationId, behaviorSettings);
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error updating behavior settings:', error);
    throw error;
  }
}

/**
 * Pause conversation (AI won't respond)
 */
export async function pauseConversation(conversationId: number) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        controlMode: 'paused',
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast control mode change
    broadcastControlModeChange(conversationId, 'paused', null);
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error pausing conversation:', error);
    throw error;
  }
}

/**
 * Resume conversation (switch back to auto)
 */
export async function resumeConversation(conversationId: number) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        controlMode: 'auto',
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast control mode change
    broadcastControlModeChange(conversationId, 'auto', null);
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error resuming conversation:', error);
    throw error;
  }
}

/**
 * Close conversation
 */
export async function closeConversation(conversationId: number) {
  try {
    const updated = await db
      .update(conversations)
      .set({
        status: 'closed',
        resolved: true,
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Broadcast conversation update
    broadcastConversationUpdate(updated[0]);

    return updated[0];
  } catch (error) {
    console.error('Error closing conversation:', error);
    throw error;
  }
}
