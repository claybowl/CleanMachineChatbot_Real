import { Express, Request, Response } from 'express';
import twilio from 'twilio';
import { requireAuth } from './authMiddleware';
import {
  getAllConversations,
  getConversationById,
  getOrCreateConversation,
  addMessage,
  takeoverConversation,
  handoffConversation,
  updateBehaviorSettings,
  pauseConversation,
  resumeConversation,
  closeConversation,
} from './conversationService';

/**
 * Register conversation monitoring routes
 */
export function registerConversationRoutes(app: Express) {
  // Apply authentication middleware to all conversation routes
  app.use('/api/conversations*', requireAuth);
  // Create a new conversation (from Messages UI)
  app.post('/api/conversations/create', async (req: Request, res: Response) => {
    try {
      const { phone, name } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      // Create or get conversation
      const conversation = await getOrCreateConversation(
        phone,
        name || null,
        'web' // Start as web conversation
      );

      res.json({
        success: true,
        conversation,
        message: 'Conversation created successfully',
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get all conversations
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const conversations = await getAllConversations(status as string);

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversations',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get conversation by ID with full message history
  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Take over conversation (switch to manual mode)
  app.post('/api/conversations/:id/takeover', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { agentUsername } = req.body;

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      if (!agentUsername) {
        return res.status(400).json({
          success: false,
          message: 'Agent username is required',
        });
      }

      const conversation = await takeoverConversation(conversationId, agentUsername);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation taken over successfully',
      });
    } catch (error) {
      console.error('Error taking over conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to take over conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Hand off conversation back to AI
  app.post('/api/conversations/:id/handoff', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await handoffConversation(conversationId);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation handed off to AI successfully',
      });
    } catch (error) {
      console.error('Error handing off conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to hand off conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Update behavior settings
  app.patch('/api/conversations/:id/behavior', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const behaviorSettings = req.body;

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await updateBehaviorSettings(conversationId, behaviorSettings);

      res.json({
        success: true,
        data: conversation,
        message: 'Behavior settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating behavior settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update behavior settings',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Pause conversation
  app.post('/api/conversations/:id/pause', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await pauseConversation(conversationId);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation paused successfully',
      });
    } catch (error) {
      console.error('Error pausing conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Resume conversation
  app.post('/api/conversations/:id/resume', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await resumeConversation(conversationId);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation resumed successfully',
      });
    } catch (error) {
      console.error('Error resuming conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Close conversation
  app.post('/api/conversations/:id/close', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await closeConversation(conversationId);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation closed successfully',
      });
    } catch (error) {
      console.error('Error closing conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to close conversation',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Send manual message as agent
  app.post('/api/conversations/:id/send-message', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, channel } = req.body;

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required',
        });
      }

      // Get conversation to find customer phone
      const conversation = await getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      // Deliver message to customer based on channel BEFORE saving to database
      if (conversation.platform === 'sms') {
        // Check if Twilio is configured
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
          return res.status(500).json({
            success: false,
            message: 'SMS delivery is not configured. Missing Twilio credentials.',
          });
        }

        // Send via Twilio for SMS
        try {
          if (!conversation.customerPhone) {
            return res.status(400).json({
              success: false,
              message: 'No customer phone number available for SMS delivery',
            });
          }

          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          await client.messages.create({
            body: content,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: conversation.customerPhone,
          });
          
          console.log(`Manual message sent via SMS to ${conversation.customerPhone}`);
        } catch (smsError: any) {
          console.error('Error sending SMS:', smsError);
          return res.status(500).json({
            success: false,
            message: 'Failed to deliver SMS message',
            error: smsError.message || String(smsError),
            details: 'The message was not sent to the customer. Please try again or contact them via another channel.',
          });
        }
      }

      // Save message to database after successful delivery (or for web chat)
      const message = await addMessage(conversationId, content, 'agent', channel || 'web');
      // For web chat, the message is broadcast via WebSocket in addMessage

      res.json({
        success: true,
        data: message,
        message: conversation.platform === 'sms' 
          ? 'Message sent successfully via SMS'
          : 'Message sent successfully',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get messages for a conversation
  app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      res.json({
        success: true,
        data: conversation.messages || [],
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get AI reply suggestions for a conversation
  app.get('/api/conversations/:id/suggestions', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const conversation = await getConversationById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      // Generate AI suggestions
      const { generateReplySuggestions } = await import('./aiSuggestionService');
      const suggestions = await generateReplySuggestions(
        conversationId,
        conversation.customerPhone || '',
        conversation.messages || [],
        conversation.platform as 'sms' | 'web'
      );

      res.json({
        success: true,
        suggestions,
      });
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate AI suggestions',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Return conversation to AI mode
  app.post('/api/conversations/:id/return-to-ai', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { agentName, notifyCustomer } = req.body;

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID',
        });
      }

      const { returnToAI } = await import('./handoffDetectionService');
      const { notifyReturnToAI } = await import('./smsNotificationService');
      const { sendSMS } = await import('./notifications');

      const conversation = await getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
      }

      // Return to AI
      const customerNotification = await returnToAI(conversationId, agentName, notifyCustomer !== false);

      // Send notification to customer if requested and on SMS
      if (notifyCustomer !== false && conversation.platform === 'sms' && customerNotification && conversation.customerPhone) {
        await sendSMS(conversation.customerPhone, customerNotification);
      }

      // Notify business owner
      await notifyReturnToAI(
        conversationId,
        conversation.customerName,
        conversation.customerPhone || 'Unknown',
        agentName
      );

      res.json({
        success: true,
        message: 'Conversation returned to AI',
      });
    } catch (error) {
      console.error('Error returning to AI:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to return conversation to AI',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
