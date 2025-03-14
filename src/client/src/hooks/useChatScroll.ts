import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage } from '../types/chat';

// Type-safe debounce function without using any
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  }) as T;
}

export function useChatScroll(
  messages: ChatMessage[],
  isTyping: boolean,
  scrollBehavior: ScrollBehavior = 'smooth'
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  // Track if we should lock to bottom (user hasn't scrolled up manually)
  const [lockToBottom, setLockToBottom] = useState(true);
  // Track last message count to detect new messages
  const lastMessageCountRef = useRef<number>(0);
  // Store previous scroll positions to detect direction
  const lastScrollTopRef = useRef<number>(0);
  // Track if user has manually scrolled up
  const userScrolledUpRef = useRef<boolean>(false);
  
  // Find the scroll container once when component mounts
  useEffect(() => {
    if (messagesEndRef.current) {
      // The scroll container is the first parent with overflow-y: auto or scroll
      let element = messagesEndRef.current.parentElement;
      while (element) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          scrollContainerRef.current = element;
          break;
        }
        element = element.parentElement;
      }

      // If we couldn't find an appropriate container, use document.documentElement
      if (!scrollContainerRef.current) {
        scrollContainerRef.current = document.documentElement;
      }
    }
  }, []);

  // Optimized check if user is near bottom of the chat
  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 100px of bottom
    const newIsNearBottom = distanceFromBottom < 100;
    setIsNearBottom(newIsNearBottom);
    
    // If user scrolled significantly upward, unlock from bottom
    if (lastScrollTopRef.current > scrollTop && 
        lastScrollTopRef.current - scrollTop > 50 &&
        !newIsNearBottom) {
      setLockToBottom(false);
      userScrolledUpRef.current = true;
    }
    
    // If user scrolled to bottom, re-enable lock
    if (newIsNearBottom && !lockToBottom) {
      setLockToBottom(true);
      userScrolledUpRef.current = false;
    }
    
    lastScrollTopRef.current = scrollTop;
  }, [lockToBottom]);

  // Debounced version to avoid performance issues
  const debouncedCheckIfNearBottom = useCallback(
    () => debounce(checkIfNearBottom, 100)(),
    [checkIfNearBottom]
  );

  // Set up scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', debouncedCheckIfNearBottom);
    return () => container.removeEventListener('scroll', debouncedCheckIfNearBottom);
  }, [debouncedCheckIfNearBottom]);

  // Improved scroll to bottom function with better typing
  const scrollToBottom = useCallback((options?: ScrollIntoViewOptions | undefined) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: scrollBehavior,
        block: 'end',
        ...options
      });
      setLockToBottom(true);
      userScrolledUpRef.current = false;
    }
  }, [scrollBehavior]);

  // Handle auto-scrolling based on different conditions
  useEffect(() => {
    // Detect new messages
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    
    // Different scroll strategies for different scenarios:
    
    // 1. For new messages when user is at bottom or hasn't scrolled up manually
    if (hasNewMessages && (isNearBottom || lockToBottom)) {
      // Small delay to ensure content has rendered
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    } 
    // 2. For typing indicator when locked to bottom
    else if (isTyping && lockToBottom) {
      // Use a less frequent scroll for typing to avoid jumpiness
      const scrollInterval = setInterval(() => {
        if (lockToBottom && !userScrolledUpRef.current) {
          scrollToBottom({ behavior: 'auto' }); // use auto for smoother experience during typing
        }
      }, 500);
      
      return () => clearInterval(scrollInterval);
    }
  }, [messages.length, isTyping, isNearBottom, lockToBottom, scrollToBottom]);

  // Force scroll check when typing state changes
  useEffect(() => {
    checkIfNearBottom();
  }, [isTyping, checkIfNearBottom]);

  return {
    messagesEndRef,
    isNearBottom,
    scrollToBottom,
    scrollContainerRef
  };
}
