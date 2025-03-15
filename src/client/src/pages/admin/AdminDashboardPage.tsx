import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faUserCheck, faUserTimes } from '@fortawesome/free-solid-svg-icons';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboardPage = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [activeUserCount, setActiveUserCount] = useState<number>(0);
  const [inactiveUserCount, setInactiveUserCount] = useState<number>(0);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get user counts
        const usersData = await adminService.getUsers(0, 1);
        const activeUsersData = await adminService.getUsers(0, 1, undefined, true);
        const inactiveUsersData = await adminService.getUsers(0, 1, undefined, false);
        
        setUserCount(usersData.totalElements);
        setActiveUserCount(activeUsersData.totalElements);
        setInactiveUserCount(inactiveUsersData.totalElements);
        
        // Get recent users
        const recentUsersData = await adminService.getUsers(0, 5);
        setRecentUsers(recentUsersData.content);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and key metrics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FontAwesomeIcon icon={faUsers} className="text-blue-500 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Total Users</h3>
            <p className="text-2xl font-bold text-blue-600">{userCount}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <FontAwesomeIcon icon={faUserCheck} className="text-green-500 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Active Users</h3>
            <p className="text-2xl font-bold text-green-600">{activeUserCount}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
          <div className="rounded-full bg-red-100 p-3 mr-4">
            <FontAwesomeIcon icon={faUserTimes} className="text-red-500 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Inactive Users</h3>
            <p className="text-2xl font-bold text-red-600">{inactiveUserCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Access Menu */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/users" className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 flex items-center transition-colors">
            <FontAwesomeIcon icon={faUsers} className="text-blue-500 mr-3" />
            <span className="font-medium">Manage Users</span>
          </Link>
          
          <Link to="/admin/users?status=active" className="bg-green-50 hover:bg-green-100 rounded-lg p-4 flex items-center transition-colors">
            <FontAwesomeIcon icon={faUserCheck} className="text-green-500 mr-3" />
            <span className="font-medium">View Active Users</span>
          </Link>
          
          <Link to="/admin/users?status=inactive" className="bg-red-50 hover:bg-red-100 rounded-lg p-4 flex items-center transition-colors">
            <FontAwesomeIcon icon={faUserTimes} className="text-red-500 mr-3" />
            <span className="font-medium">View Inactive Users</span>
          </Link>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recently Registered Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{user.displayName || user.username}</div>
                      <div className="text-sm text-gray-500 ml-2">({user.email})</div>
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.chatCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.messageCount}
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
          
          {recentUsers.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No users found.
            </div>
          )}
          
          <div className="mt-4 text-center">
            <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 font-medium">
              View All Users →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
