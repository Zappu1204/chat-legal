import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="welcome text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Hi, I'm ViVu Chat!</h2>
      <p className="text-gray-600 mb-4">Hello, {user?.username}! How can I help you today??</p>
    </div>
  );
};

export default HomePage;
