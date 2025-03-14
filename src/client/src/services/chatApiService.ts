import api from './api';
import { ChatResponse, ChatMessageResponse } from '../types/chat';

/**
 * Service for interacting with the Chat API endpoints
 */
const chatApiService = {
  /**
   * Create a new chat session
   */
  createChat: async (model: string, title?: string, description?: string): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/api/chats', {
      model,
      title: title ?? 'New Chat',
      description
    });
    return response.data;
  },

  /**
   * Get chat by ID
   */
  getChat: async (chatId: string): Promise<ChatResponse> => {
    const response = await api.get<ChatResponse>(`/api/chats/${chatId}`);
    return response.data;
  },

  /**
   * Get all user chats with pagination
   */
  getUserChats: async (page: number = 0, size: number = 10): Promise<{ content: ChatResponse[], totalPages: number }> => {
    const response = await api.get<{ content: ChatResponse[], totalPages: number }>(`/api/chats?page=${page}&size=${size}`);
    return response.data;
  },

  /**
   * Delete a chat
   */
  deleteChat: async (chatId: string): Promise<void> => {
    await api.delete(`/api/chats/${chatId}`);
  },

  /**
   * Send a message to a chat
   */
  sendMessage: async (chatId: string, content: string): Promise<ChatMessageResponse> => {
    if (!chatId) {
      throw new Error('Chat ID is required');
    }
    
    if (!content) {
      throw new Error('Message content is required');
    }
    
    // Make sure content is a string
    const messageContent = String(content);
    
    // Check for very suspicious patterns:
    // 1. If it looks like a UUID with dashes (common ID format)
    // 2. Or if it's exactly matching the chatId parameter (which would be a serious error)
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageContent) ||
      messageContent === chatId
    ) {
      console.error('[CRITICAL] Attempted to send an ID as message content:', messageContent);
      throw new Error('Invalid message content that appears to be an ID');
    }
    
    console.debug(`Sending message to chat ${chatId}:`, messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''));
    
    const response = await api.post<ChatMessageResponse>(`/api/chats/${chatId}/messages`, {
      content: messageContent
    });
    return response.data;
  },

  /**
   * Get all messages for a chat
   */
  getChatMessages: async (chatId: string): Promise<ChatMessageResponse[]> => {
    const response = await api.get<ChatMessageResponse[]>(`/api/chats/${chatId}/messages`);
    return response.data;
  }
};

export default chatApiService;
