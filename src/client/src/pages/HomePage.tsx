import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';

const HomePage = () => {
  const { user } = useAuth();
  const { messages, isTyping, error, sendMessage, dismissError } = useChat();

  return (
    <div className="flex flex-col justify-center h-screen overflow-y-auto">
      <div className={`max-w-4xl w-full mx-auto ${messages.length === 0 ? '' : 'flex-grow'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Chào bạn, Tớ là ViVu AI!</h2>
            <p className="text-gray-600 mb-8">
              {user?.username} ngoan xinh yêu ơi! Cứ hành tớ thoải mái nhé?
            </p>

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
      </div>
      <div className={`max-w-4xl w-full mx-auto ${messages.length === 0 ? '' : 'sticky'} bottom-0 bg-white p-4`}>
        <div className="p-6 rounded-lg w-full text-center">
          <p className="text-gray-700 font-medium mb-4">Vài loại câu hỏi tớ có thể trả lời:</p>
          <div className="space-x-2 text-gray-600 text-sm flex flex-wrap">
            <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
              onClick={() => sendMessage("Làm thế nào để có người yêu?")}>
              Làm thế nào để có người yêu?
            </div>
            <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
              onClick={() => sendMessage("Tại sao lập trình viên không thích deadline?")}>
              Tại sao lập trình viên không thích deadline?
            </div>
            <div aria-hidden className="p-2 bg-slate-100 rounded-full shadow-md hover:bg-slate-200 cursor-pointer"
              onClick={() => sendMessage("Vì sao thứ 2 là ngày buồn nhất trong tuần?")}>
              Vì sao thứ 2 là ngày buồn nhất trong tuần?
            </div>
          </div>
        </div>
        <ChatInput
          onSubmit={sendMessage}
          isDisabled={isTyping}
          placeholder={isTyping ? "Chờ tý! tớ đang trả lời mà..." : "Gõ đê bạn ơi..."}
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4" role="alert">
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
