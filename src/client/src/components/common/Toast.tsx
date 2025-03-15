import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faExclamationCircle,
  faInfoCircle, 
  faExclamationTriangle, 
  faTimes 
} from '@fortawesome/free-solid-svg-icons';
import { Toast as ToastType, useToast } from '../../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  // Appearance animation
  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const getToastClassName = () => {
    let baseClasses = 'max-w-md w-full p-4 rounded-md shadow-lg transition-all transform';
    
    if (isVisible) {
      baseClasses += ' translate-y-0 opacity-100';
    } else {
      baseClasses += ' translate-y-2 opacity-0';
    }
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-l-4 border-green-500 text-green-700`;
      case 'error':
        return `${baseClasses} bg-red-50 border-l-4 border-red-500 text-red-700`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border-l-4 border-blue-500 text-blue-700`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faExclamationCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'info':
      default:
        return faInfoCircle;
    }
  };

  return (
    <div className={getToastClassName()} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <FontAwesomeIcon icon={getIcon()} />
        </div>
        <div className="flex-1">
          <p className="text-sm">{toast.message}</p>
        </div>
        <div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
