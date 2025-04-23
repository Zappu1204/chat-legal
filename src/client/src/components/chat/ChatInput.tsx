import React, { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner, faBookOpen, faRobot } from '@fortawesome/free-solid-svg-icons';
import { useChat } from '../../contexts/ChatContext';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  isDisabled = false,
  placeholder = 'Nhập tin nhắn của bạn...',
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { ragMode, toggleRagMode } = useChat();

  // Resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isDisabled) {
      onSubmit(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center p-2 border border-gray-300 rounded-lg shadow-sm bg-white">
          {/* RAG Toggle Button */}
          <button
            type="button"
            onClick={toggleRagMode}
            className={`p-2 rounded-full mr-2 ${
              ragMode 
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={ragMode ? 'Đang sử dụng chế độ hỏi đáp luật giao thông' : 'Chuyển sang chế độ hỏi đáp luật giao thông'}
          >
            <FontAwesomeIcon icon={ragMode ? faBookOpen : faRobot} />
          </button>
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            className="flex-grow px-3 py-2 resize-none outline-none text-gray-700 max-h-32"
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim() || isDisabled}
            className={`p-2 rounded-full ${
              !message.trim() || isDisabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isDisabled ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
          </button>
        </div>
      </form>
      
      {/* Mode indicator */}
      <div className="absolute bottom-full left-0 mb-1 text-xs text-gray-500">
        {ragMode ? (
          <span className="flex items-center text-indigo-600">
            <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
            Chế độ hỏi đáp luật giao thông
          </span>
        ) : (
          <span className="flex items-center">
            <FontAwesomeIcon icon={faRobot} className="mr-1" />
            Chế độ chat thông thường
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
