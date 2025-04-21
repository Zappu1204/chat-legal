import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useChatScroll } from '../hooks/useChatScroll';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCircleNotch, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import ModelSelector from '../components/chat/ModelSelector';
import { useState, useRef, MouseEvent } from 'react';

const HomePage = () => {
  const { user } = useAuth();
  const { messages, isTyping, error, isSaving, activeChatId, chatTitle, sendMessage, dismissError } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Use auto for instant scrolling - this prevents the visible "jumping" effect
  const { messagesEndRef, isNearBottom, scrollToBottom } = useChatScroll(messages, isTyping, 'auto');
  
  const [selectedModel, setSelectedModel] = useState('gemma3:1b'); // Default model

  const handleSendMessage = (message: string) => {
    sendMessage(message, selectedModel);
    // Force scroll to bottom when sending a new message, but use a very short delay
    // to ensure the DOM has updated with the new message
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  };
  
  // Create a wrapper function that handles MouseEvent for onClick
  const handleScrollToBottom = (e: MouseEvent) => {
    e.preventDefault();
    scrollToBottom();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="max-w-4xl w-full mx-auto flex-grow flex flex-col px-4 overflow-hidden">
        {/* Chat title/status bar */}
        <div className="sticky top-0 bg-white z-10 p-2 border-b border-slate-100 flex justify-between items-center">
          <div className="select-models">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          </div>
          {activeChatId && (
            <>
              <h2 className="text-xl font-semibol text-center text-gray-700 truncate">{chatTitle}</h2>
              {isSaving && (
                <div className="flex items-center text-sm text-blue-500">
                  <FontAwesomeIcon icon={faCircleNotch} spin className="mr-2" />
                  <span>Đang lưu ...</span>
                </div>
              )}
              {!isSaving && activeChatId && (
                <div className="flex items-center text-sm text-green-500">
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  <span>Đã lưu xong</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Make this div the scrollable container with fixed height */}
        <div 
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto overflow-x-hidden scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}
        >
          <div className="min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-end h-full text-center p-4">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Chào bạn, Tớ là PTIT Chatbot! Tớ sẽ giúp bạn các công việc hằng ngày như tra cứu lịch học, lịch thi, và các thông tin về luật Giao thông.</h2>
                <p className="text-gray-600">
                  <span className="font-semibold">{user?.username}</span> hãy sử dụng tớ thoải mái nhé!
                </p>
                {!activeChatId && (
                  <p className="text-gray-500 mt-2 text-sm italic">
                    (Hãy nhắn tin cho tớ để bắt đầu trò chuyện nào!)
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={`${message.id}-${index}`}
                    message={message}
                    isLoading={isTyping && index === messages.length - 1}
                  />
                ))}
              </div>
            )}
            {/* This element is the scroll target - keep it minimal */}
            <div ref={messagesEndRef} className='mb-4' />
          </div>
        </div>
      </div>

      {/* New messages indicator & scroll button with fixed onClick handler */}
      {!isNearBottom && (
        <div className="fixed bottom-24 right-8 z-10">
          <button
            onClick={handleScrollToBottom}
            className="bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-all flex items-center"
            aria-label="Kéo xuống để xem tin nhắn mới nhé!"
          >
            <FontAwesomeIcon icon={faArrowDown} className="mr-2" />
            <span>Tin nhắn mới</span>
          </button>
        </div>
      )}

      {/* Input area - fixed at bottom */}
      <div className={`max-w-4xl w-full mx-auto sticky bottom-0 bg-white p-4 ${messages.length === 0 ? 'flex-grow' : ''}`}>
        {messages.length === 0 && (
          <div className="p-6 rounded-lg w-full text-center">
            <p className="text-gray-700 font-medium mb-4">Vài loại câu hỏi tớ có thể trả lời:</p>
            <div className="space-x-2 text-gray-600 text-sm flex flex-wrap">
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Lịch học của tôi ngày hôm nay là gì?")}>0
                Lịch học của tôi ngày hôm nay là gì?
              </div>
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Lịch thi của tôi kỳ này là gì?")}>
                Lịch thi của tôi kỳ này là gì?
              </div>
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Người điều khiển xe mô tô hai bánh, xe mô tô ba bánh, xe gắn máy không được thực hiện những hành vi nào?")}>
                Người điều khiển xe mô tô hai bánh, xe mô tô ba bánh, xe gắn máy không được thực hiện những hành vi nào?
              </div>
            </div>
          </div>
        )}
        <ChatInput
          onSubmit={handleSendMessage}
          isDisabled={isTyping || isSaving}
          placeholder={
            isTyping ? "Hãy chờ một lát" :
              isSaving ? "Đang lưu..." : "Hãy nhập tin nhắn của bạn..."
          }
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4 max-w-4xl mx-auto" role="alert">
          <p className="text-red-700">{error}</p>
          <button
            type='button'
            onClick={dismissError}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Bỏ qua
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
