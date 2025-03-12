import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useChatScroll } from '../hooks/useChatScroll';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';

const HomePage = () => {
  const { user } = useAuth();
  const { messages, isTyping, error, sendMessage, dismissError } = useChat();
  const messagesEndRef = useChatScroll(messages, isTyping);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl w-full mx-auto">
      <div className="flex-grow overflow-y-auto">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-4">Hi, I'm ViVu Chat!</h2>
              <p className="text-gray-600 mb-8">
                Hello, {user?.username}! How can I help you today?
              </p>
              <div className="bg-gray-50 p-6 rounded-lg max-w-lg w-full">
                <p className="text-gray-700 font-medium mb-4">Sample questions you can ask:</p>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => sendMessage("What can you help me with?")}>
                    What can you help me with?
                  </li>
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => sendMessage("Tell me a fun fact about programming.")}>
                    Tell me a fun fact about programming.
                  </li>
                  <li className="p-2 bg-white rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => sendMessage("Explain how a blockchain works.")}>
                    Explain how a blockchain works.
                  </li>
                </ul>
              </div>
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
        </div>
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

      <div className="p-4">
        <ChatInput
          onSubmit={sendMessage}
          isDisabled={isTyping}
          placeholder={isTyping ? "ViVu is typing..." : "Type your message..."}
        />
      </div>
    </div>
  );
};

export default HomePage;
