import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextProps {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add a toast notification
  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = uuidv4();
    const newToast: Toast = {
      id,
      type,
      message,
      duration
    };
    
    setToasts(prevToasts => [...prevToasts, newToast]);
    
    // Automatically remove toast after duration
    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  // Remove a toast notification
  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
