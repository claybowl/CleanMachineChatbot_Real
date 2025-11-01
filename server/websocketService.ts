import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initialize the WebSocket server
 */
export function initializeWebSocket(socketServer: SocketIOServer) {
  io = socketServer;
  console.log('WebSocket service initialized');

  // Set up event handlers
  io.on('connection', (socket) => {
    console.log('Client connected to conversation monitoring:', socket.id);

    // Join monitoring room
    socket.on('join_monitoring', () => {
      socket.join('monitoring');
      console.log(`Socket ${socket.id} joined monitoring room`);
    });

    // Leave monitoring room
    socket.on('leave_monitoring', () => {
      socket.leave('monitoring');
      console.log(`Socket ${socket.id} left monitoring room`);
    });

    // Join a specific conversation room (for live chat participants)
    socket.on('join_conversation', (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from conversation monitoring:', socket.id);
    });
  });
}

/**
 * Broadcast new message to monitoring dashboard AND to the conversation room
 */
export function broadcastNewMessage(conversationId: number, message: any) {
  if (!io) {
    console.warn('WebSocket not initialized, cannot broadcast message');
    return;
  }

  // Broadcast to monitoring dashboard
  io.to('monitoring').emit('new_message', {
    conversationId,
    message,
  });

  // Broadcast to the conversation room (for live chat participants)
  io.to(`conversation:${conversationId}`).emit('conversation_message', {
    id: message.id,
    content: message.content,
    sender: message.sender,
    timestamp: message.timestamp,
  });
}

/**
 * Broadcast conversation status update
 */
export function broadcastConversationUpdate(conversation: any) {
  if (!io) {
    console.warn('WebSocket not initialized, cannot broadcast conversation update');
    return;
  }

  io.to('monitoring').emit('conversation_updated', conversation);
}

/**
 * Broadcast new conversation created
 */
export function broadcastNewConversation(conversation: any) {
  if (!io) {
    console.warn('WebSocket not initialized, cannot broadcast new conversation');
    return;
  }

  io.to('monitoring').emit('new_conversation', conversation);
}

/**
 * Broadcast control mode change (takeover/handoff)
 */
export function broadcastControlModeChange(conversationId: number, controlMode: string, assignedAgent: string | null) {
  if (!io) {
    console.warn('WebSocket not initialized, cannot broadcast control mode change');
    return;
  }

  io.to('monitoring').emit('control_mode_changed', {
    conversationId,
    controlMode,
    assignedAgent,
  });
}

/**
 * Broadcast behavior settings update
 */
export function broadcastBehaviorUpdate(conversationId: number, behaviorSettings: any) {
  if (!io) {
    console.warn('WebSocket not initialized, cannot broadcast behavior update');
    return;
  }

  io.to('monitoring').emit('behavior_updated', {
    conversationId,
    behaviorSettings,
  });
}

export function getWebSocketServer() {
  return io;
}
