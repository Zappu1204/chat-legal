import React, { useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { useTypingEffect } from '../../hooks/useTypingEffect';
import { useThinkingTimer } from '../../hooks/useThinkingTimer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faBookOpen, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const { content, role, thinking, thinkingTime, think, sources } = message;
  const [showSources, setShowSources] = useState(false);
  const loadingDots = useTypingEffect(isLoading);
  const elapsed = useThinkingTimer(thinking || false);

  // Xử lý highlighting các phần code trong nội dung
  const renderContent = () => {
    const displayedContent = content || '';
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose">
        {displayedContent + (isLoading ? loadingDots : '')}
      </ReactMarkdown>
    );
  };

  // Các class CSS dựa trên role
  const containerClasses = role === 'user' 
    ? 'bg-blue-50 border-blue-100' 
    : 'bg-slate-50 border-slate-100';

  const iconClasses = role === 'user'
    ? 'text-blue-600 bg-blue-100'
    : 'text-purple-600 bg-purple-100';

  const hasThinking = think && think.length > 0;
  const hasSources = sources && sources.length > 0;

  return (
    <div className={`p-4 border ${containerClasses} rounded-lg mb-4`}>
      <div className="flex items-start">
        <div className={`p-2 rounded-full mr-3 ${iconClasses}`}>
          <FontAwesomeIcon icon={role === 'user' ? faUser : faRobot} />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-semibold text-gray-800">{role === 'user' ? 'Bạn' : 'Trợ lý AI'}</div>
          <div className="mt-1 text-gray-700">
            {thinking ? (
              <div className="flex flex-col">
                <div className="italic text-gray-500">Đang suy nghĩ... {elapsed}s</div>
                {think && <div className="mt-2 text-gray-600 bg-gray-100 p-2 rounded text-sm font-mono whitespace-pre-wrap">{think}</div>}
              </div>
            ) : (
              <div>
                {renderContent()}
                {thinkingTime && thinkingTime > 0 && hasThinking && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    (Đã suy nghĩ trong {thinkingTime.toFixed(1)}s)
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Hiển thị nguồn tài liệu RAG nếu có */}
          {hasSources && (
            <div className="mt-3 border-t border-gray-200 pt-2">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center text-blue-600 text-sm hover:text-blue-800 font-medium"
              >
                <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
                Nguồn tài liệu
                <FontAwesomeIcon 
                  icon={showSources ? faChevronUp : faChevronDown} 
                  className="ml-1 text-xs" 
                />
              </button>
              
              {showSources && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
                  {sources.map((source, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                      <div className="font-medium text-gray-700">
                        {index + 1}. {source.chapter_title}, {source.article_title}
                      </div>
                      <div className="text-gray-600 mt-1">{source.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageComponent;
