import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminRoute = () => {
  const { user, loading } = useAuth();

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Check if user exists and has admin role
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  // If not an admin, redirect to home page
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Render child routes if user is an admin
  return <Outlet />;
};

export default AdminRoute;
