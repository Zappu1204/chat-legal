import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage as ChatMessageType } from '../types/chat';
import chatService from '../services/chatService';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';

const DEFAULT_MODEL = 'deepseek-r1:32b';

const HomePage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<(() => void) | null>(null);
  const messageQueueRef = useRef<string>('');

  // System message to include at the beginning of conversations
  const systemMessage: ChatMessageType = {
    id: 'system-message',
    role: 'system',
    content: `You are ViVu, a helpful and friendly AI assistant. Today's date is ${new Date().toLocaleDateString()}.`,
    timestamp: new Date()
  };
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current();
      }
    };
  }, []);

  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update messages - similar to updateMessages in example code
  const updateMessages = useCallback((newMessage: ChatMessageType) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === 'assistant') {
        return [...prev.slice(0, -1), newMessage];
      }
      return [...prev, newMessage];
    });
  }, []);

  // Handle sending a new message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Reset state for new message
    messageQueueRef.current = '';
    setIsLoading(true);
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    // Create and add user message
    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
      thinking: false,
      think: ''
    };

    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for assistant's response
    const assistantMessageId = uuidv4();
    const assistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: false,
      think: ''
    };

    updateMessages(assistantMessage);

    // Prepare API request with conversation history
    const messagesToSend = [
      { role: systemMessage.role, content: systemMessage.content },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.role === 'user' ? msg.content : `<think>${msg.think}</think>${msg.content}`
      })),
      { role: userMessage.role, content: userMessage.content }
    ];

    try {
      // Directly mimic the approach from example code
      abortControllerRef.current = chatService.streamCompletion(
        {
          model: DEFAULT_MODEL,
          messages: messagesToSend,
          streaming: true,
          options: {
            temperature: 0.1,
            repeat_penalty: 1.2,
          }
        },
        (chunk) => {
          if (chunk.error) {
            console.error('Stream chunk error:', chunk.error);
            setIsLoading(false);
            setMessages(prev => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;
              if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content: 'Sorry, I encountered an error while responding. Please try again.',
                  thinking: false
                };
              }
              return newMessages;
            });
            return;
          }

          // Update the assistant message with the transformed message
          updateMessages({
            id: assistantMessageId,
            role: 'assistant',
            content: chunk.message?.content || '',
            timestamp: new Date(),
            thinking: !!chunk.thinking,
            think: chunk.think || '',
            thinkingStartTime: chunk.thinkingStartTime,
            thinkingTime: chunk.thinkingTime
          });

          if (chunk.done) {
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Streaming error:', error);
          setIsLoading(false);
          setError(error.message || 'An error occurred');
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: 'Sorry, I encountered an error while responding. Please try again.',
                thinking: false
              };
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: 'Sorry, I encountered an error while responding. Please try again.',
            thinking: false
          };
        }
        return newMessages;
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl w-full mx-auto">
      <div className="flex-grow overflow-y-auto">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-4">Hi, I'm ViVu Chat!</h2>
              <p className="text-gray-600 mb-8">
                Hello, {user?.username}! How can I help you today?
              </p>
              <div className="bg-gray-50 p-6 rounded-lg max-w-lg w-full">
                <p className="text-gray-700 font-medium mb-4">Sample questions you can ask:</p>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleSendMessage("What can you help me with?")}>
                    What can you help me with?
                  </li>
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleSendMessage("Tell me a fun fact about programming.")}>
                    Tell me a fun fact about programming.
                  </li>
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => handleSendMessage("Explain how a blockchain works.")}>
                    Explain how a blockchain works.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={`${message.id}-${index}-${message.content.length}`}
                message={message}
                isLoading={isLoading && index === messages.length - 1}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4" role="alert">
          <p className="text-red-700">{error}</p>
          <button 
            type='button' 
            onClick={() => setError(null)} 
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="p-4">
        <ChatInput
          onSubmit={handleSendMessage}
          isDisabled={isLoading}
          placeholder={isLoading ? "ViVu is typing..." : "Type your message..."}
        />
      </div>
    </div>
  );
};

export default HomePage;
