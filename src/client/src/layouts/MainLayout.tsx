import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
