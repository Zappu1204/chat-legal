import { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatResponse, OllamaChatRequest } from '../types/chat';
import chatService from '../services/chatService';
import chatApiService from '../services/chatApiService';

// Define context types
interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  isSaving: boolean;
  activeChatId: string | null;
  chatTitle: string;
}

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  dismissError: () => void;
  createNewChat: () => Promise<ChatResponse | null>;
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
  | { type: 'SET_ACTIVE_CHAT'; payload: { id: string | null, title: string } };

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
    default:
      return state;
  }
};

// Provider component
export const ChatProvider = ({ children, modelId = 'gemma3:1b' }: { children: ReactNode; modelId?: string }) => {
  const abortControllerRef = useRef<(() => void) | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const initialState: ChatState = {
    messages: [],
    isTyping: false,
    error: null,
    isSaving: false,
    activeChatId: null,
    chatTitle: 'New Chat',
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

  // Create a new chat session
  const createNewChat = useCallback(async () => {
    try {
      setIsInitializing(true);
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Create a new chat on the server
      const response = await chatApiService.createChat(modelId);
      
      // Set the active chat
      dispatch({ type: 'SET_ACTIVE_CHAT', payload: { 
        id: response.id, 
        title: response.title 
      }});
      
      // Clear any existing messages
      dispatch({ type: 'CLEAR_MESSAGES' });
      
      return response;
    } catch (error) {
      console.error('Error creating chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [modelId]);

  // Initialize chat if needed
  useEffect(() => {
    if (!state.activeChatId && !isInitializing) {
      createNewChat();
    }
  }, [state.activeChatId, isInitializing, createNewChat]);

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

      // Create unique IDs for both messages
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();

      // Create and add user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content,
        timestamp: new Date(),
        thinking: false,
        think: ''
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Make sure we have an active chat
      if (!state.activeChatId) {
        const newChat = await createNewChat();
        if (!newChat) {
          dispatch({ type: 'SET_TYPING', payload: false });
          return;
        }
      }

      // Save the user message to the backend immediately
      // This ensures the first message is used for chat title
      if (state.activeChatId) {
        await saveMessageToBackend(state.activeChatId, content, true);
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
          model: modelId,
          messages: messagesToSend,
          streaming: true,
          options: {
            temperature: 0.1,
            repeat_penalty: 1.2,
          }
        };

        let finalAssistantContent = '';
        let finalAssistantThinking = '';

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
            finalAssistantContent = chunk.message?.content || '';
            finalAssistantThinking = chunk.think || '';
            
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
              
              // Save the assistant response to the backend
              if (finalAssistantContent) {
                // If thinking was included, format it properly for saving
                // Make sure we're sending the actual content, not references
                const contentToSave = finalAssistantThinking 
                  ? `<think>${finalAssistantThinking}</think>${finalAssistantContent}`
                  : finalAssistantContent;
                  
                // Debug log to verify content before saving  
                console.debug('Saving AI response:', contentToSave);
                
                // Save the message with complete content
                saveMessageToBackend(state.activeChatId!, contentToSave, false);
              }
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
    [state.messages, state.isTyping, state.activeChatId, updateMessage, modelId, createNewChat, saveMessageToBackend]
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: { id: null, title: 'New Chat' } });
  }, []);

  // Dismiss error
  const dismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value = useMemo(() => ({
    messages: state.messages,
    isTyping: state.isTyping,
    error: state.error,
    isSaving: state.isSaving,
    activeChatId: state.activeChatId,
    chatTitle: state.chatTitle,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat
  }), [
    state.messages,
    state.isTyping,
    state.error,
    state.isSaving,
    state.activeChatId,
    state.chatTitle,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat
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
