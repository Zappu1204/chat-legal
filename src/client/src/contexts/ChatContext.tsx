import { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatResponse, ChatState, OllamaChatRequest } from '../types/chat';
import chatService from '../services/chatService';
import chatApiService from '../services/chatApiService';

interface ChatContextType extends ChatState {
  sendMessage: (content: string, model?: string) => void;
  clearMessages: () => void;
  dismissError: () => void;
  createNewChat: (createInDatabase?: boolean, model?: string) => Promise<ChatResponse | null>;
  loadChatHistory: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Define action types
type ChatAction =
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ACTIVE_CHAT'; payload: { id: string | null, title: string } }
  | { type: 'SET_CHAT_HISTORY'; payload: ChatResponse[] }
  | { type: 'SET_LOADING_HISTORY'; payload: boolean }
  | { type: 'REMOVE_CHAT_FROM_HISTORY'; payload: string };

// Reducer function
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_ACTIVE_CHAT':
      return { 
        ...state, 
        activeChatId: action.payload.id,
        chatTitle: action.payload.title 
      };
    case 'SET_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload };
    case 'SET_LOADING_HISTORY':
      return { ...state, isLoadingHistory: action.payload };
    case 'REMOVE_CHAT_FROM_HISTORY':
      return { 
        ...state, 
        chatHistory: state.chatHistory.filter(chat => chat.id !== action.payload) 
      };
    default:
      return state;
  }
};

// Provider component
export const ChatProvider = ({ children, modelId = 'gemma3:1b' }: { children: ReactNode; modelId?: string }) => {
  const abortControllerRef = useRef<(() => void) | null>(null);
  
  const initialState: ChatState = {
    messages: [],
    isTyping: false,
    error: null,
    isSaving: false,
    activeChatId: null,
    chatTitle: 'New Chat',
    chatHistory: [],
    isLoadingHistory: false,
  };

  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current();
      }
    };
  }, []);

  // Move the loadChatHistory declaration up before it's used
  const loadChatHistory = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_HISTORY', payload: true });
    
    try {
      const response = await chatApiService.getUserChats();
      dispatch({ type: 'SET_CHAT_HISTORY', payload: response.content });
    } catch (error) {
      console.error('Error loading chat history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat history';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_HISTORY', payload: false });
    }
  }, []);

  // Create a new chat session - now with option to create locally only
  const createNewChat = useCallback(async (createInDatabase: boolean = true, model?: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      if (createInDatabase) {
        // Create a new chat on the server
        const useModelId = model ?? modelId;
        const response = await chatApiService.createChat(useModelId);
        
        // Set the active chat
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: { 
          id: response.id, 
          title: response.title 
        }});
        
        // Refresh chat history after creating a new chat
        setTimeout(() => {
          loadChatHistory(); // Call loadChatHistory after a short delay
        }, 100);
        
        return response;
      } else {
        // Just reset UI state without API call
        dispatch({ type: 'CLEAR_MESSAGES' });
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: { 
          id: null, 
          title: 'New Chat' 
        }});
        return null;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return null;
    }
  }, [modelId, loadChatHistory]);

  // Select and load a specific chat
  const selectChat = useCallback(async (chatId: string) => {
    if (chatId === state.activeChatId) return;
    
    // Clear existing messages while loading
    dispatch({ type: 'CLEAR_MESSAGES' });
    
    try {
      dispatch({ type: 'SET_LOADING_HISTORY', payload: true });
      const chat = await chatApiService.getChat(chatId);
      
      // Set active chat details
      dispatch({ 
        type: 'SET_ACTIVE_CHAT', 
        payload: { id: chat.id, title: chat.title } 
      });
      
      // Convert messages from API format to client format
      const formattedMessages = chat.messages.map(msg => ({
        id: msg.id,
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        thinking: false,
        think: ''
      }));
      
      // Set the retrieved messages
      dispatch({ type: 'SET_MESSAGES', payload: formattedMessages });
      
    } catch (error) {
      console.error('Error loading chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_HISTORY', payload: false });
    }
  }, [state.activeChatId]);

  // Update messages
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, updates } });
  }, []);

  // Save message to backend
  const saveMessageToBackend = useCallback(async (
    chatId: string, 
    content: string,
    isUserMessage: boolean
  ) => {
    if (!chatId) return null;
    
    try {
      dispatch({ type: 'SET_SAVING', payload: true });
      
      // Ensure we're sending the actual message content, not a reference or ID
      const actualContent = content.trim();
      
      // Debug log to verify the content being sent
      console.debug('Saving message content:', actualContent);
      
      const response = await chatApiService.sendMessage(chatId, actualContent);
      
      // If this was the first user message, the title might have been updated
      if (isUserMessage && state.messages.filter(m => m.role === 'user').length === 1) {
        try {
          // The server should set the title based on the first question
          // But we can also fetch the updated chat to get the title
          const updatedChat = await chatApiService.getChat(chatId);
          
          if (updatedChat.title && updatedChat.title !== state.chatTitle && updatedChat.title !== 'New Chat') {
            dispatch({ 
              type: 'SET_ACTIVE_CHAT', 
              payload: { id: chatId, title: updatedChat.title }
            });
          } else {
            // As fallback, set the title from the first message if it wasn't set by the server
            const truncatedTitle = actualContent.length > 50 
              ? actualContent.substring(0, 47) + '...' 
              : actualContent;
              
            dispatch({
              type: 'SET_ACTIVE_CHAT',
              payload: { id: chatId, title: truncatedTitle }
            });
          }
        } catch (e) {
          console.error('Error fetching updated chat title:', e);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error saving message:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save message to the server';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return null;
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.messages, state.chatTitle]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!content.trim() || state.isTyping) return;

      // Reset state for new message
      dispatch({ type: 'SET_TYPING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Clear previous thinking state
      sessionStorage.removeItem('thinkingStartTime');
      sessionStorage.removeItem('thinkingTime');

      if (abortControllerRef.current) {
        abortControllerRef.current();
        abortControllerRef.current = null;
      }

      // Create unique IDs for both messages
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();

      // Create user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: new Date(),
        thinking: false,
        think: ''
      };

      // Only create a new chat if we don't have an active chat
      let currentChatId = state.activeChatId;
      let isNewChat = false;
      
      if (!currentChatId) {
        // Now actually create the chat in the database since user is sending a message
        const newChat = await createNewChat(true, model); // Pass true to create in database along with optional model
        if (!newChat) {
          dispatch({ type: 'SET_TYPING', payload: false });
          return;
        }
        currentChatId = newChat.id;
        isNewChat = true;
      }
      
      // Add the user message to the UI
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      try {
        // Save the user message to the backend
        await saveMessageToBackend(currentChatId, content, true);
        
        // If this is the first message of a new chat, refresh the chat list
        // This helps update the sidebar with the new chat including its proper title
        if (isNewChat) {
          // Use a short delay to give the backend time to update the chat title
          setTimeout(() => {
            loadChatHistory();
          }, 500);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
        // Continue with the conversation even if saving fails
      }

      // Add placeholder for assistant's response
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: false,
        think: ''
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      // Prepare API request with conversation history
      const messagesToSend = [
        ...state.messages.map(msg => ({
          role: msg.role,
          content: msg.role === 'user' ? msg.content : `${msg.think ? `<think>${msg.think}</think>` : ''}${msg.content}`
        })),
        { role: userMessage.role, content: userMessage.content }
      ];

      try {
        // Send streaming request to Ollama
        const request: OllamaChatRequest = {
          model: model || modelId,
          messages: messagesToSend,
          streaming: true,
          options: {
            temperature: 0.1,
            repeat_penalty: 1.2,
          }
        };

        let finalAssistantContent = '';
        let finalAssistantThinking = '';
        let savedAssistantResponse = false; // Flag to track if response has been saved

        abortControllerRef.current = chatService.streamCompletion(
          request,
          (chunk) => {
            if (chunk.error) {
              console.error('Stream chunk error:', chunk.error);
              dispatch({ type: 'SET_TYPING', payload: false });
              updateMessage(assistantMessageId, {
                content: 'Sorry, I encountered an error while responding. Please try again.',
                thinking: false
              });
              return;
            }

            // Update assistant message with new content
            finalAssistantContent = chunk.message?.content ?? '';
            finalAssistantThinking = chunk.think ?? '';
            
            updateMessage(assistantMessageId, {
              content: chunk.message?.content ?? '',
              thinking: !!chunk.thinking,
              think: chunk.think ?? '',
              thinkingStartTime: chunk.thinkingStartTime,
              thinkingTime: chunk.thinkingTime
            });

            if (chunk.done && !savedAssistantResponse) {
              // Ensure we preserve the thinking time in the final message
              if (chunk.think && chunk.thinkingTime) {
                updateMessage(assistantMessageId, {
                  thinking: false,
                  thinkingTime: chunk.thinkingTime
                });
              }
              dispatch({ type: 'SET_TYPING', payload: false });
              
              // Save the assistant response to the backend ONLY if not already saved
              savedAssistantResponse = true; // Mark as saved to prevent duplicate calls
              
              if (finalAssistantContent && currentChatId) {
                // If thinking was included, format it properly for saving
                const contentToSave = finalAssistantThinking 
                  ? `<think>${finalAssistantThinking}</think>${finalAssistantContent}`
                  : finalAssistantContent;
                
                try {
                  // Create a local content variable for this specific save operation
                  const assistantContent = String(contentToSave);
                  console.debug('Saving AI response (once):', assistantContent.substring(0, 50) + (assistantContent.length > 50 ? '...' : ''));
                  
                  // Save the message with complete content
                  saveMessageToBackend(currentChatId, assistantContent, false)
                    .catch(err => console.error('Error saving AI response:', err));
                } catch (err) {
                  console.error('Error preparing AI response for saving:', err);
                }
              }
            }
          },
          (error) => {
            console.error('Streaming error:', error);
            dispatch({ type: 'SET_TYPING', payload: false });
            dispatch({ type: 'SET_ERROR', payload: error.message ?? 'An error occurred' });
            updateMessage(assistantMessageId, {
              content: 'Sorry, I encountered an error while responding. Please try again.',
              thinking: false
            });
          }
        );
      } catch (error) {
        console.error('Error sending message:', error);
        dispatch({ type: 'SET_TYPING', payload: false });
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        updateMessage(assistantMessageId, {
          content: 'Sorry, I encountered an error while responding. Please try again.',
          thinking: false
        });
      }
    },
    [state.messages, state.isTyping, state.activeChatId, updateMessage, modelId, createNewChat, saveMessageToBackend, loadChatHistory]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: { id: null, title: 'New Chat' } });
  }, []);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    if (!chatId) return;
    
    try {
      await chatApiService.deleteChat(chatId);
      
      // Remove from chat history
      dispatch({ type: 'REMOVE_CHAT_FROM_HISTORY', payload: chatId });
      
      // If it was the active chat, clear messages and reset active chat
      if (chatId === state.activeChatId) {
        dispatch({ type: 'CLEAR_MESSAGES' });
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: { id: null, title: 'New Chat' } });
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.activeChatId]);

  // Dismiss error
  const dismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Load chat history on component mount - moved after all function definitions
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const value = useMemo(() => ({
    messages: state.messages,
    isTyping: state.isTyping,
    error: state.error,
    isSaving: state.isSaving,
    activeChatId: state.activeChatId,
    chatTitle: state.chatTitle,
    chatHistory: state.chatHistory,
    isLoadingHistory: state.isLoadingHistory,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat,
    loadChatHistory,
    selectChat,
    deleteChat
  }), [
    state.messages,
    state.isTyping,
    state.error,
    state.isSaving,
    state.activeChatId,
    state.chatTitle,
    state.chatHistory,
    state.isLoadingHistory,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat,
    loadChatHistory,
    selectChat,
    deleteChat
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
