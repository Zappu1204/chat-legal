import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

interface ChatInputProps {
    onSubmit: (message: string) => void;
    isDisabled: boolean;
    placeholder?: string;
}

const ChatInput = ({ onSubmit, isDisabled, placeholder = 'Gõ đê bạn ơi...' }: ChatInputProps) => {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            // Reset height
            textareaRef.current.style.height = 'auto';
            // Set new height based on content
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [message]);

    const handleSubmit = () => {
        if (message.trim() && !isDisabled) {
            onSubmit(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-gray-200 p-4 bg-slate-100 rounded-lg shadow-md">
            <div>
                <div className="form-group">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={isDisabled}
                        rows={1}
                        className="w-full resize-none rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
                <div className="form-actions flex justify-end items-center gap-2">
                    <button title='Gửi tin nhắn' type='button'
                        onClick={handleSubmit}
                        disabled={isDisabled ?? !message.trim()}
                        className="bg-blue-500 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center disabled:bg-gray-300"
                    >
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
