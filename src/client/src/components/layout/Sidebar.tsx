import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faAngleDoubleLeft, faAngleDoubleRight, faSignOut } from '@fortawesome/free-solid-svg-icons';
import Logo from '../../assets/logo.png';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const profileButtonRef = useRef<HTMLDivElement>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
            console.error('Logout error:', error);
        }
    };

    return (
        <aside className={`bg-slate-100 text-gray-500 flex flex-col justify-between transition-all duration-300 ease-in-out ${isCollapsed ? 'w-14' : 'w-64'}`}>
            <div className="top">
                <div className={`flex items-center *:hover:cursor-pointer ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
                    <div className="brand flex items-center flex-grow">
                        <img src={Logo} alt='logo' className={isCollapsed ? 'w-14 h-14 p-2' : 'w-10 h-10 ml-3'} />
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
                <button className='flex items-center h-14 p-4 hover:bg-blue-500 hover:text-white w-full hover:cursor-pointer transition-colors'>
                    <FontAwesomeIcon icon={faComments} />
                    <span className={isCollapsed ? 'hidden' : 'ml-3'}>Chat</span>
                </button>
            </div>
            <div className="chat-list flex-grow">
                {/* Chat list items would go here */}
            </div>
            <div className={`flex justify-between items-center relative ${isCollapsed ? 'flex-col' : 'w-full px-3 py-2'}`}>
                <div
                    ref={profileButtonRef}
                    aria-hidden="true"
                    className={`block hover:cursor-pointer w-14 h-14 ${isCollapsed ? 'p-2' : ''}`}
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                >
                    <img
                        src={Logo}
                        alt='profile'
                        className='border border-blue-500 rounded-full hover:border-blue-700 transition-all'
                    />
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
                    <Link
                        to='/profile'
                        className='block w-full p-4 border-b border-gray-200 hover:bg-blue-500 hover:text-white hover:rounded-t-md transition-colors'
                        onClick={() => setIsProfileDropdownOpen(false)}
                    >
                        {user?.username ?? 'Profile'}
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className='block w-full p-4 border-b border-gray-200 hover:bg-blue-500 hover:text-white hover:rounded-b-md text-left transition-colors'
                    >
                        <FontAwesomeIcon icon={faSignOut} className='mr-3' />
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
