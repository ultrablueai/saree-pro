// Real-time Chat System for Saree Pro
// Supports live messaging between customers, drivers, merchants, and support

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'driver' | 'merchant' | 'admin' | 'support';
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'order_update';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
    orderId?: string;
    orderStatus?: string;
  };
  reactions?: Array<{
    emoji: string;
    userId: string;
    timestamp: Date;
  }>;
  replyTo?: string;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group' | 'order' | 'support';
  participants: Array<{
    id: string;
    name: string;
    role: 'customer' | 'driver' | 'merchant' | 'admin' | 'support';
    avatar?: string;
    isOnline: boolean;
    lastSeen?: Date;
  }>;
  lastMessage?: ChatMessage;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    orderId?: string;
    supportTicketId?: string;
    isArchived?: boolean;
    isPinned?: boolean;
  };
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'driver' | 'merchant' | 'admin' | 'support';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  typingStatus: 'idle' | 'typing' | 'paused';
  permissions: {
    canSendMessages: boolean;
    canSendFiles: boolean;
    canSendImages: boolean;
    canShareLocation: boolean;
    canCreateGroup: boolean;
  };
  preferences: {
    soundEnabled: boolean;
    desktopNotifications: boolean;
    emailNotifications: boolean;
    autoTranslate: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
  status: 'typing' | 'paused';
  timestamp: Date;
}

export class ChatService {
  private ws: WebSocket | null = null;
  private currentUser: ChatUser | null = null;
  private rooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private typingIndicators: Map<string, TypingIndicator[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupWebSocket();
  }

  /**
   * Initialize chat with user authentication
   */
  async initialize(user: ChatUser): Promise<void> {
    this.currentUser = user;
    
    try {
      // Connect to WebSocket server
      await this.connectWebSocket();
      
      // Load user's chat rooms
      await this.loadUserRooms();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Chat service initialized for user:', user.name);
    } catch (error) {
      console.error('Failed to initialize chat service:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    roomId: string,
    content: string,
    type: ChatMessage['type'] = 'text',
    metadata?: ChatMessage['metadata']
  ): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const message: ChatMessage = {
      id: this.generateId(),
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderRole: this.currentUser.role,
      receiverId: '', // Will be set by server
      content,
      type,
      timestamp: new Date(),
      status: 'sending',
      metadata,
    };

    try {
      // Add to local messages immediately
      this.addMessageToRoom(roomId, message);
      
      // Send to server
      await this.sendToServer({
        type: 'message',
        data: {
          roomId,
          message,
        },
      });

      return message;
    } catch (error) {
      message.status = 'sent';
      throw error;
    }
  }

  /**
   * Send file/image
   */
  async sendFile(
    roomId: string,
    file: File,
    type: 'image' | 'file'
  ): Promise<ChatMessage> {
    // Upload file to storage
    const uploadResult = await this.uploadFile(file);
    
    return this.sendMessage(roomId, '', type, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      ...uploadResult,
    });
  }

  /**
   * Send location
   */
  async sendLocation(
    roomId: string,
    location: { lat: number; lng: number; address: string }
  ): Promise<ChatMessage> {
    return this.sendMessage(roomId, '', 'location', { location });
  }

  /**
   * Create new chat room
   */
  async createRoom(
    type: ChatRoom['type'],
    participantIds: string[],
    metadata?: ChatRoom['metadata']
  ): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: this.generateId(),
      type,
      participants: [
        {
          id: this.currentUser!.id,
          name: this.currentUser!.name,
          role: this.currentUser!.role,
          avatar: this.currentUser!.avatar,
          isOnline: true,
        },
        ...participantIds.map(id => ({
          id,
          name: '', // Will be populated by server
          role: 'customer' as const,
          isOnline: false,
        })),
      ],
      unreadCount: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    await this.sendToServer({
      type: 'create_room',
      data: { room },
    });

    this.rooms.set(room.id, room);
    return room;
  }

  /**
   * Join existing room
   */
  async joinRoom(roomId: string): Promise<void> {
    await this.sendToServer({
      type: 'join_room',
      data: { roomId },
    });
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string): Promise<void> {
    await this.sendToServer({
      type: 'leave_room',
      data: { roomId },
    });

    this.rooms.delete(roomId);
    this.messages.delete(roomId);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId: string, messageIds?: string[]): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.unreadCount[this.currentUser!.id] = 0;
      this.rooms.set(roomId, room);
    }

    await this.sendToServer({
      type: 'mark_read',
      data: { roomId, messageIds },
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(roomId: string, status: 'typing' | 'paused'): void {
    const indicator: TypingIndicator = {
      userId: this.currentUser!.id,
      userName: this.currentUser!.name,
      roomId,
      status,
      timestamp: new Date(),
    };

    this.sendToServer({
      type: 'typing',
      data: indicator,
    });
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    roomId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    await this.sendToServer({
      type: 'reaction',
      data: { roomId, messageId, emoji },
    });
  }

  /**
   * Edit message
   */
  async editMessage(
    roomId: string,
    messageId: string,
    newContent: string
  ): Promise<void> {
    await this.sendToServer({
      type: 'edit_message',
      data: { roomId, messageId, content: newContent },
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    await this.sendToServer({
      type: 'delete_message',
      data: { roomId, messageId },
    });
  }

  /**
   * Get room messages
   */
  async getRoomMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const messages = this.messages.get(roomId) || [];
    return messages.slice(-limit);
  }

  /**
   * Get user rooms
   */
  getUserRooms(): ChatRoom[] {
    return Array.from(this.rooms.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get typing indicators for room
   */
  getTypingIndicators(roomId: string): TypingIndicator[] {
    return this.typingIndicators.get(roomId) || [];
  }

  /**
   * Setup WebSocket connection
   */
  private setupWebSocket(): void {
    const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8080';
    
    this.ws = new WebSocket(`${wsUrl}/chat`);
    
    this.ws.onopen = () => {
      console.log('Chat WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      this.handleServerMessage(JSON.parse(event.data));
    };
    
    this.ws.onclose = () => {
      console.log('Chat WebSocket disconnected');
      this.handleReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.setupWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Connect to WebSocket with authentication
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      this.ws!.onopen = () => {
        clearTimeout(timeout);
        
        // Authenticate
        this.sendToServer({
          type: 'auth',
          data: {
            userId: this.currentUser!.id,
            token: await this.getAuthToken(),
          },
        });
        
        resolve();
      };
    });
  }

  /**
   * Handle server messages
   */
  private handleServerMessage(data: any): void {
    switch (data.type) {
      case 'message':
        this.handleIncomingMessage(data.data);
        break;
      case 'typing':
        this.handleTypingIndicator(data.data);
        break;
      case 'reaction':
        this.handleReaction(data.data);
        break;
      case 'room_updated':
        this.handleRoomUpdate(data.data);
        break;
      case 'user_status':
        this.handleUserStatusUpdate(data.data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Handle incoming message
   */
  private handleIncomingMessage(data: { roomId: string; message: ChatMessage }): void {
    this.addMessageToRoom(data.roomId, data.message);
    
    // Update room's last message
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.lastMessage = data.message;
      room.updatedAt = data.message.timestamp;
      
      // Increment unread count if not from current user
      if (data.message.senderId !== this.currentUser!.id) {
        room.unreadCount[this.currentUser!.id] = 
          (room.unreadCount[this.currentUser!.id] || 0) + 1;
      }
      
      this.rooms.set(data.roomId, room);
    }

    // Trigger notification
    this.triggerNotification(data.message);
  }

  /**
   * Handle typing indicator
   */
  private handleTypingIndicator(data: TypingIndicator): void {
    const indicators = this.typingIndicators.get(data.roomId) || [];
    
    // Remove existing indicator for this user
    const filtered = indicators.filter(ind => ind.userId !== data.userId);
    
    // Add new indicator if typing
    if (data.status === 'typing') {
      filtered.push(data);
    }
    
    this.typingIndicators.set(data.roomId, filtered);
  }

  /**
   * Handle reaction
   */
  private handleReaction(data: { roomId: string; messageId: string; reaction: any }): void {
    const messages = this.messages.get(data.roomId);
    if (messages) {
      const message = messages.find(m => m.id === data.messageId);
      if (message) {
        message.reactions = message.reactions || [];
        message.reactions.push(data.reaction);
      }
    }
  }

  /**
   * Handle room update
   */
  private handleRoomUpdate(data: ChatRoom): void {
    this.rooms.set(data.id, data);
  }

  /**
   * Handle user status update
   */
  private handleUserStatusUpdate(data: { userId: string; isOnline: boolean; lastSeen?: Date }): void {
    this.rooms.forEach(room => {
      const participant = room.participants.find(p => p.id === data.userId);
      if (participant) {
        participant.isOnline = data.isOnline;
        participant.lastSeen = data.lastSeen;
      }
    });
  }

  /**
   * Add message to room
   */
  private addMessageToRoom(roomId: string, message: ChatMessage): void {
    const messages = this.messages.get(roomId) || [];
    messages.push(message);
    this.messages.set(roomId, messages);
  }

  /**
   * Send message to server
   */
  private async sendToServer(data: any): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  /**
   * Upload file to storage
   */
  private async uploadFile(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    
    return response.json();
  }

  /**
   * Load user's chat rooms
   */
  private async loadUserRooms(): Promise<void> {
    try {
      const response = await fetch('/api/chat/rooms');
      const rooms: ChatRoom[] = await response.json();
      
      rooms.forEach(room => {
        this.rooms.set(room.id, room);
      });
      
      // Load messages for each room
      for (const room of rooms) {
        const messages = await this.getRoomMessages(room.id);
        this.messages.set(room.id, messages);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Mark messages as read when page becomes visible
        this.rooms.forEach((room, roomId) => {
          if (room.unreadCount[this.currentUser!.id] > 0) {
            this.markAsRead(roomId);
          }
        });
      }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      this.ws?.close();
    });
  }

  /**
   * Trigger notification for new message
   */
  private triggerNotification(message: ChatMessage): void {
    if (document.visibilityState === 'visible') {
      return;
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.senderName}: ${message.content}`, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: message.id,
      });
    }

    // Sound notification
    if (this.currentUser?.preferences.soundEnabled) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    // Get from localStorage or auth service
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Singleton instance
export const chatService = new ChatService();

// Utility functions
export function formatMessageTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    return `${Math.floor(diff / 60000)}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    return `${Math.floor(diff / 3600000)}h ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
}

export function getMessageTypeIcon(type: ChatMessage['type']): string {
  switch (type) {
    case 'text': return '💬';
    case 'image': return '🖼️';
    case 'file': return '📎';
    case 'location': return '📍';
    case 'order_update': return '📦';
    default: return '💬';
  }
}
