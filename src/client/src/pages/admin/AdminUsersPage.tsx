import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faUserCheck, 
  faUserTimes,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faComments,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import adminService, { UserAdminData } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Custom pagination controls component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number, 
  totalPages: number,
  onPageChange: (page: number) => void 
}) => {
  // Calculate page range to show (show 5 pages max)
  const getPageRange = () => {
    const pages = [];
    const startPage = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
    const endPage = Math.min(startPage + 4, totalPages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-center mt-4">
      <div className="flex items-center space-x-1">
        <button type="button" title="Previous page"
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        
        {getPageRange().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded border ${
              page === currentPage 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            {page + 1}
          </button>
        ))}
        
        <button type="button" title="Next page"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
};

const AdminUsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserAdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [filter, setFilter] = useState(() => {
    const status = searchParams.get('status');
    if (status === 'active') return true;
    if (status === 'inactive') return false;
    return undefined;
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page) : 0;
  });
  
  // Update search params when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    
    if (searchTerm) params.search = searchTerm;
    
    if (filter !== undefined) {
      params.status = filter ? 'active' : 'inactive';
    }
    
    if (currentPage > 0) {
      params.page = currentPage.toString();
    }
    
    setSearchParams(params);
  }, [searchTerm, filter, currentPage, setSearchParams]);
  
  // Load users when filters change
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const response = await adminService.getUsers(
          currentPage,
          10,
          searchTerm || undefined,
          filter
        );
        
        setUsers(response.content);
        setTotalPages(response.totalPages);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUsers();
  }, [currentPage, searchTerm, filter]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0); // Reset to first page on new search
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status: boolean | undefined) => {
    setFilter(status);
    setCurrentPage(0);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-600 mt-1">View, search and manage all users</p>
      </div>

      {/* Search and filter section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name, email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" />
                ) : null}
              </button>
            </div>
          </form>
          
          {/* Status filter buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusFilterChange(undefined)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === undefined 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === true
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >
              <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
              Active
            </button>
            <button
              onClick={() => handleStatusFilterChange(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === false
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-50 hover:bg-red-100 text-red-700'
              }`}
            >
              <FontAwesomeIcon icon={faUserTimes} className="mr-2" />
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading && users.length === 0 ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{user.displayName || user.username}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.lockedUntil && (
                        <div className="text-xs text-orange-600 mt-1">
                          Locked until: {formatDate(user.lockedUntil)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <FontAwesomeIcon icon={faComments} className="mr-1 text-blue-500" />
                        {user.chatCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.messageCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found matching your criteria</p>
              </div>
            )}
            
            {/* Pagination */}
            <div className="px-6 py-3 bg-gray-50">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
