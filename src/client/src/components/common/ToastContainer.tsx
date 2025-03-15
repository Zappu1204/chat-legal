import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
