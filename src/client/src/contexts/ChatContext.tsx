import { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, OllamaChatRequest } from '../types/chat';
import chatService from '../services/chatService';

// Define context types
interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
}

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  dismissError: () => void;
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
  | { type: 'CLEAR_MESSAGES' };

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
    default:
      return state;
  }
};

// Provider component
export const ChatProvider = ({ children, modelId = 'deepseek-r1:latest' }: { children: ReactNode; modelId?: string }) => {
  const abortControllerRef = useRef<(() => void) | null>(null);
  
  const initialState: ChatState = {
    messages: [],
    isTyping: false,
    error: null,
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

  // Update messages
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    dispatch({ type: 'UPDATE_MESSAGE', payload: { id: messageId, updates } });
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
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

      // Create and add user message
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: new Date(),
        thinking: false,
        think: ''
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Add placeholder for assistant's response
      const assistantMessageId = uuidv4();
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
        // Send streaming request
        const request: OllamaChatRequest = {
          model: modelId,
          messages: messagesToSend,
          streaming: true,
          options: {
            temperature: 0.1,
            repeat_penalty: 1.2,
          }
        };

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

            // Update assistant message with new content, ensuring think and content are separate
            updateMessage(assistantMessageId, {
              content: chunk.message?.content || '',
              thinking: !!chunk.thinking,
              think: chunk.think || '',
              thinkingStartTime: chunk.thinkingStartTime,
              thinkingTime: chunk.thinkingTime
            });

            if (chunk.done) {
              // Ensure we preserve the thinking time in the final message
              if (chunk.think && chunk.thinkingTime) {
                updateMessage(assistantMessageId, {
                  thinking: false,
                  thinkingTime: chunk.thinkingTime
                });
              }
              dispatch({ type: 'SET_TYPING', payload: false });
            }
          },
          (error) => {
            console.error('Streaming error:', error);
            dispatch({ type: 'SET_TYPING', payload: false });
            dispatch({ type: 'SET_ERROR', payload: error.message || 'An error occurred' });
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
    [state.messages, state.isTyping, updateMessage, modelId]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  // Dismiss error
  const dismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value = {
    messages: state.messages,
    isTyping: state.isTyping,
    error: state.error,
    sendMessage,
    clearMessages,
    dismissError
  };

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
