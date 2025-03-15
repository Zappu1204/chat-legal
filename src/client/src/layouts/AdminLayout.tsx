import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faUsers, 
  faChevronLeft, 
  faSignOutAlt, 
  faBars,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.png';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navItems = [
    { path: '/admin', icon: faTachometerAlt, label: 'Dashboard' },
    { path: '/admin/users', icon: faUsers, label: 'Users' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-white transition-all duration-300 ${
        sidebarOpen ? 'md:w-64 w-64' : 'md:w-20 w-0'
      }`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={Logo} alt="Logo" className="h-8 w-8" />
            {sidebarOpen && <span className="ml-3 text-xl font-semibold">Admin</span>}
          </div>
          <button type="button" title="Toggle sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:flex hidden text-white focus:outline-none"
          >
            <FontAwesomeIcon icon={faChevronLeft} className={`transform transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="mt-8">
          <div className="px-4 mb-4">
            {sidebarOpen && <h5 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Management</h5>}
          </div>
          <ul>
            {navItems.map((item) => (
              <li key={item.path} className="mb-2">
                <Link 
                  to={item.path}
                  className={`flex items-center px-4 py-3 transition-colors ${
                    isActive(item.path) ? 'bg-blue-700 text-white' : 'hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className={`${sidebarOpen ? 'mr-4' : 'mx-auto'}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="px-4 mt-8 mb-4">
            {sidebarOpen && <h5 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Account</h5>}
          </div>
          <ul>
            <li>
              <Link 
                to="/"
                className="flex items-center px-4 py-3 hover:bg-blue-700 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className={`${sidebarOpen ? 'mr-4' : 'mx-auto'}`} />
                {sidebarOpen && <span>Back to App</span>}
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="flex items-center w-full text-left px-4 py-3 hover:bg-blue-700 hover:text-white transition-colors"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className={`${sidebarOpen ? 'mr-4' : 'mx-auto'}`} />
                {sidebarOpen && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 flex justify-between items-center">
            <button type="button" title="Toggle sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-600 focus:outline-none"
            >
              <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Admin Panel</h1>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">{user?.username}</span>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
