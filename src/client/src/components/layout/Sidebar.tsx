import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight, faPlus, faSignOut } from '@fortawesome/free-solid-svg-icons';
import Logo from '../../assets/logo.png';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import ChatHistoryItem from '../chat/ChatHistoryItem';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const profileButtonRef = useRef<HTMLDivElement>(null);

    const { user, logout } = useAuth();
    const {
        chatHistory,
        activeChatId,
        isLoadingHistory,
        createNewChat,
        selectChat,
        deleteChat,
        loadChatHistory
    } = useChat();

    const navigate = useNavigate();

    // Refresh chat history when sidebar mounts
    useEffect(() => {
        loadChatHistory();
    }, [loadChatHistory]);

    // Additional effect to react to activeChatId changes
    // This ensures the sidebar highlights the correct active chat
    useEffect(() => {
        if (activeChatId) {
            const activeChat = chatHistory.find(chat => chat.id === activeChatId);
            if (!activeChat) {
                // If the active chat isn't in our history yet, refresh the list
                loadChatHistory();
            }
        }
    }, [activeChatId, chatHistory, loadChatHistory]);

    // Handle collapse based on window width
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) { // 768px is typically md breakpoint in Tailwind
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        // Set initial state based on window width
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle click outside dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isProfileDropdownOpen &&
                profileDropdownRef.current &&
                profileButtonRef.current &&
                !profileDropdownRef.current.contains(event.target as Node) &&
                !profileButtonRef.current.contains(event.target as Node)
            ) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileDropdownOpen]);

    const handleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        }
    };

    const handleNewChat = () => {
        // Pass false to prevent API call, just reset UI
        // Navigate to chat page to start a new chat
        navigate('/');
        createNewChat(false);
    };

    return (
        <aside className={`bg-slate-100 text-gray-500 flex flex-col h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'w-14' : 'w-64'}`}>
            <div className="top">
                <div className={`flex items-center *:hover:cursor-pointer ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
                    <div className="brand flex items-center flex-grow">
                        <img src={Logo} alt='logo' className={isCollapsed ? 'w-14 h-14 p-1' : 'w-12 h-12 ml-3'} />
                        <span className={isCollapsed ? 'hidden' : 'text-2xl font-bold text-black ml-3'}>ViVu</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCollapse}
                        title='Toggle Sidebar'
                        className='w-14 h-14 hover:bg-blue-500 hover:text-white transition-colors'
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <FontAwesomeIcon icon={isCollapsed ? faAngleDoubleRight : faAngleDoubleLeft} />
                    </button>
                </div>
                <button
                    className='flex items-center h-14 p-4 hover:bg-blue-500 hover:text-white w-full hover:cursor-pointer transition-colors'
                    onClick={handleNewChat}
                    title="Chat mới nè!"
                >
                    <FontAwesomeIcon icon={faPlus} className={isCollapsed ? 'w-6 h-6' : 'mr-2'} />
                    <span className={isCollapsed ? 'hidden' : ''}>Chat mới nè</span>
                </button>
            </div>

            {/* Chat history list */}
            <div className="flex-grow">
                <div className={`chat-list overflow-y-auto p-2 ${isCollapsed ? 'hidden' : ''}`}>
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-2 px-2">Lịch sử chém gió</h3>
                    {isLoadingHistory ? (
                        <div className="flex justify-center items-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                        </div>
                    ) : chatHistory.length === 0 ? (
                        <div className="text-center text-gray-500 p-4">
                            <p className="text-sm">Không có cuộc trò chuyện nào</p>
                            <p className="text-xs">Bắt đầu cuộc trò chuyện mới!</p>
                        </div>
                    ) : (
                        chatHistory.map(chat => (
                            <ChatHistoryItem
                                key={chat.id}
                                chat={chat}
                                isActive={chat.id === activeChatId}
                                onSelect={() => selectChat(chat.id)}
                                onDelete={() => deleteChat(chat.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            <div className={`flex justify-between items-center relative border-t border-gray-300 ${isCollapsed ? 'flex-col' : 'w-full px-3 py-2'}`}>
                <div ref={profileButtonRef} aria-hidden="true" className={`block hover:cursor-pointer w-12 h-12 ${isCollapsed ? 'p-1' : ''} transition-all`}
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                    <img src={Logo} alt='profile' className='border border-blue-500 rounded-full hover:border-blue-700 transition-all' />
                </div>
                {!isCollapsed && (
                    <div className="user-info ml-2 flex-grow">
                        <p className="font-medium text-gray-800">{user?.username ?? 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.email ?? ''}</p>
                    </div>
                )}
                <div
                    ref={profileDropdownRef}
                    className={`absolute bottom-full ${isCollapsed ? 'left-4' : 'left-3'} w-36 bg-white shadow-lg rounded-md z-10 *:hover:cursor-pointer ${isProfileDropdownOpen ? 'block' : 'hidden'}`}
                >
                    <Link to='/profile'
                        className='block w-full p-4 border-b border-gray-200 hover:bg-blue-500 hover:text-white hover:rounded-t-md transition-colors'>
                        {user?.username ?? 'Profile'}
                    </Link>
                    <Link to='/settings'
                        className='block w-full p-4 border-b border-gray-200 hover:bg-blue-500 hover:text-white hover:rounded-t-md transition-colors'>
                        Cài đặt
                    </Link>
                    <button type="button" onClick={handleLogout}
                        className='block w-full p-4 border-b border-gray-200 hover:bg-blue-500 hover:text-white hover:rounded-b-md text-left transition-colors'>
                        <FontAwesomeIcon icon={faSignOut} className='mr-3' />
                        Bye nha!
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
