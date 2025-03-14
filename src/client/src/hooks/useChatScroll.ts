import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from '../types/chat';

export function useChatScroll(
  messages: ChatMessage[],
  isTyping: boolean,
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Check if user is near bottom of the chat
  const checkIfNearBottom = () => {
    if (!messagesEndRef.current) return;
    
    const container = messagesEndRef.current.parentElement;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 100px of bottom
    setIsNearBottom(distanceFromBottom < 100);
  };

  // Set up scroll event listener to detect when user scrolls away from bottom
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => checkIfNearBottom();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to bottom only when new messages are added or if user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, isNearBottom]);

  // For typing streams, scroll less frequently to avoid jarring experience
  useEffect(() => {
    if (isTyping && isNearBottom) {
      const scrollInterval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 1000); // Less frequent for smoother experience
      return () => clearInterval(scrollInterval);
    }
  }, [isTyping, isNearBottom]);

  return {
    messagesEndRef,
    isNearBottom,
    scrollToBottom: () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  };
}
