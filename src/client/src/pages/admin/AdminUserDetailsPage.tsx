import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faEnvelope, 
  faPhone, 
  faCalendar,
  faUserCheck,
  faUserTimes,
  faSpinner,
  faArrowLeft,
  faExclamationTriangle,
  faLock,
  faUnlock,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import adminService, { UserAdminData, UserStatusUpdateRequest } from '../../services/adminService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminUserDetailsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserAdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Status update state
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<'activate' | 'deactivate' | null>(null);
  
  // Load user details
  useEffect(() => {
    const loadUserDetails = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const userData = await adminService.getUserDetails(userId);
        setUser(userData);
      } catch (error) {
        console.error('Error loading user details:', error);
        setError('Failed to load user details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserDetails();
  }, [userId]);
  
  // Handle status update
  const handleStatusUpdate = async (isActive: boolean) => {
    if (!userId || !user) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    
    try {
      const statusUpdate: UserStatusUpdateRequest = {
        isActive,
        reason: isActive ? 'Account activated by administrator' : 'Account deactivated by administrator'
      };
      
      const response = await adminService.updateUserStatus(userId, statusUpdate);
      
      if (response.success) {
        setUpdateSuccess(response.message);
        // Update local user state
        setUser(prev => prev ? { ...prev, isActive } : null);
      } else {
        setUpdateError(response.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setUpdateError(error instanceof Error ? error.message : 'An error occurred updating user status');
    } finally {
      setIsUpdating(false);
      setShowConfirmation(false);
      setPendingAction(null);
    }
  };
  
  // Open confirmation dialog
  const confirmStatusChange = (action: 'activate' | 'deactivate') => {
    setPendingAction(action);
    setShowConfirmation(true);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-3" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600">{error || 'User not found'}</p>
            <button 
              onClick={() => navigate('/admin/users')}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Return to users list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center">
        <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 flex items-center mr-4">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to users
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 flex-grow">User Details</h1>
      </div>
      
      {/* Status update messages */}
      {updateSuccess && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-3" />
            <p className="text-green-700">{updateSuccess}</p>
          </div>
        </div>
      )}
      
      {updateError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-3" />
            <p className="text-red-700">{updateError}</p>
          </div>
        </div>
      )}

      {/* User profile card */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-6 bg-blue-50 flex flex-col md:flex-row md:items-center">
          <div className="mr-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-4 mr-4">
              <FontAwesomeIcon icon={faUser} className="text-blue-500 text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user.displayName || user.username}</h2>
              <p className="text-gray-600">@{user.username}</p>
            </div>
          </div>
          
          <div className="md:ml-auto flex flex-wrap gap-2 mt-4 md:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            
            {user.roles.map(role => (
              <span 
                key={role} 
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  role.includes('ADMIN') 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {role.replace('ROLE_', '')}
              </span>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">User Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faEnvelope} className="text-gray-500 mr-3 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p>{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faPhone} className="text-gray-500 mr-3 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p>{user.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faCalendar} className="text-gray-500 mr-3 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Registered</p>
                    <p>{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faCalendar} className="text-gray-500 mr-3 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p>{formatDate(user.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Usage Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Chats</span>
                  <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{user.chatCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Messages</span>
                  <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{user.messageCount}</span>
                </div>
                
                {user.lastActivity && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Activity</span>
                    <span className="text-gray-800">{formatDate(user.lastActivity)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* User actions */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            
            <div className="flex flex-wrap gap-3">
              {user.isActive ? (
                <button
                  onClick={() => confirmStatusChange('deactivate')}
                  disabled={isUpdating}
                  className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  <FontAwesomeIcon icon={isUpdating ? faSpinner : faUserTimes} className={isUpdating ? 'animate-spin mr-2' : 'mr-2'} />
                  Deactivate User
                </button>
              ) : (
                <button
                  onClick={() => confirmStatusChange('activate')}
                  disabled={isUpdating}
                  className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  <FontAwesomeIcon icon={isUpdating ? faSpinner : faUserCheck} className={isUpdating ? 'animate-spin mr-2' : 'mr-2'} />
                  Activate User
                </button>
              )}
              
              <button
                onClick={() => {/* Add lock functionality */}}
                disabled={isUpdating}
                className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
              >
                <FontAwesomeIcon icon={user.lockedUntil ? faUnlock : faLock} className="mr-2" />
                {user.lockedUntil ? 'Unlock Account' : 'Lock Temporarily'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">{
              pendingAction === 'activate' 
                ? 'Activate User Account' 
                : 'Deactivate User Account'
            }</h3>
            
            <p className="text-gray-600 mb-6">
              {pendingAction === 'activate' 
                ? `Are you sure you want to activate ${user.username}'s account? This will allow them to log in and use the system.`
                : `Are you sure you want to deactivate ${user.username}'s account? They will no longer be able to log in until the account is reactivated.`
              }
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleStatusUpdate(pendingAction === 'activate')}
                disabled={isUpdating}
                className={`px-4 py-2 text-white rounded-md ${
                  pendingAction === 'activate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } flex items-center`}
              >
                {isUpdating && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                {pendingAction === 'activate' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetailsPage;
