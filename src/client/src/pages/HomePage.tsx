import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useChatScroll } from '../hooks/useChatScroll';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCircleNotch } from '@fortawesome/free-solid-svg-icons';

const HomePage = () => {
  const { user } = useAuth();
  const { messages, isTyping, error, isSaving, activeChatId, chatTitle, sendMessage, dismissError } = useChat();
  const { messagesEndRef, isNearBottom, scrollToBottom } = useChatScroll(messages, isTyping);

  const handleSendMessage = (message: string) => {
    sendMessage(message);
    // Force scroll to bottom when sending a new message
    setTimeout(scrollToBottom, 100);
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto">
        {/* Chat title/status bar - only show when there's an active chat */}
        {activeChatId && (
          <div className="sticky top-0 bg-white z-10 p-2 border-b flex justify-between items-center">
            <h2 className="font-medium text-gray-700 truncate">{chatTitle}</h2>
            {isSaving && (
              <div className="flex items-center text-sm text-blue-500">
                <FontAwesomeIcon icon={faCircleNotch} spin className="mr-2" />
                <span>Saving...</span>
              </div>
            )}
            {!isSaving && activeChatId && (
              <div className="flex items-center text-sm text-green-500">
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                <span>Saved</span>
              </div>
            )}
          </div>
        )}

        <div className="flex-grow">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-end h-full text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-4">Chào bạn, Tớ là ViVu AI!</h2>
              <p className="text-gray-600">
                {user?.username} ngoan xinh yêu ơi! Cứ hành tớ thoải mái nhé?
              </p>
              {!activeChatId && (
                <p className="text-gray-500 mt-2 text-sm italic">
                  (Hãy nhắn tin cho tớ để bắt đầu trò chuyện nhé!)
                </p>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={`${message.id}-${index}-${message.content.length}`}
                message={message}
                isLoading={isTyping && index === messages.length - 1}
              />
            ))
          )}
          <div ref={messagesEndRef} />
          
          {!isNearBottom && isTyping && (
            <button 
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-all"
              aria-label="Scroll to bottom"
            >
              ↓ New messages
            </button>
          )}
        </div>
      </div>
      <div className={`max-w-4xl w-full mx-auto ${messages.length === 0 ? '' : 'sticky'} bottom-0 bg-white p-4`}>
        {messages.length === 0 && (
          <div className="p-6 rounded-lg w-full text-center">
            <p className="text-gray-700 font-medium mb-4">Vài loại câu hỏi tớ có thể trả lời:</p>
            <div className="space-x-2 text-gray-600 text-sm flex flex-wrap">
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Làm thế nào để có người yêu?")}>
                Làm thế nào để có người yêu?
              </div>
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Tại sao lập trình viên không thích deadline?")}>
                Tại sao lập trình viên không thích deadline?
              </div>
              <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
                onClick={() => handleSendMessage("Vì sao thứ 2 là ngày buồn nhất trong tuần?")}>
                Vì sao thứ 2 là ngày buồn nhất trong tuần?
              </div>
            </div>
          </div>
        )}
        <ChatInput
          onSubmit={handleSendMessage}
          isDisabled={isTyping || isSaving}
          placeholder={
            isTyping ? "Chờ tý! tớ đang trả lời mà..." : 
            isSaving ? "Đang lưu..." :
            "Gõ đê bạn ơi..."
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
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
