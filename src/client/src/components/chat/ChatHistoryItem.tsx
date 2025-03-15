import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faTrash } from '@fortawesome/free-solid-svg-icons';
import { ChatResponse } from '../../types/chat';
import { formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ChatHistoryItemProps {
    chat: ChatResponse;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

const ChatHistoryItem = ({ chat, isActive, onSelect, onDelete }: ChatHistoryItemProps) => {
    const navigate = useNavigate();
    
    // Format the date to be relative to now
    const formattedDate = formatDistance(
        new Date(chat.updatedAt),
        new Date(),
        { addSuffix: true }
    );

    // Handle click to ensure navigation to home page first, then select chat
    const handleClick = () => {
        // If we're already on the home page, just select the chat
        if (window.location.pathname === '/') {
            onSelect();
        } else {
            // Navigate to home page first, then select the chat
            navigate('/');
            // Execute onSelect with a small delay to ensure navigation completes
            setTimeout(() => {
                onSelect();
            }, 100);
        }
    };

    return (
        <div className={`flex items-center justify-between p-2 mb-1 rounded-md cursor-pointer text-left transition-colors ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-slate-200'}`}
            onClick={handleClick} title={chat.title}>
            <div className="flex items-center flex-grow overflow-hidden">
                <FontAwesomeIcon icon={faComment} className="mr-3" />
                <div className="truncate">
                    <div className="font-medium truncate">{chat.title ?? 'New Chat'}</div>
                    <div className="text-xs opacity-70 truncate">{formattedDate}</div>
                </div>
            </div>
            <button
                className={`p-2 rounded-full ${isActive ? 'text-white hover:bg-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                    onDelete();
                }}
                title="Delete chat"
            >
                <FontAwesomeIcon icon={faTrash} className='cursor-pointer w-8 h-8 text-red-500'/>
            </button>
        </div>
    );
};

export default ChatHistoryItem;
