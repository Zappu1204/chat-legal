import { useRef, useEffect } from 'react';
import { ChatMessage } from '../types/chat';

export function useChatScroll(
  messages: ChatMessage[],
  isTyping: boolean,
  dependencies: any[] = []
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ...dependencies]);

  // Force update scrolling for streaming content
  useEffect(() => {
    if (isTyping) {
      const scrollInterval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);

      return () => clearInterval(scrollInterval);
    }
  }, [isTyping]);

  return messagesEndRef;
}
