import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import AdminRoute from './components/routing/AdminRoute'
import AnonymousLayout from './layouts/AnonymousLayout'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminUserDetailsPage from './pages/admin/AdminUserDetailsPage'
import ToastContainer from './components/common/ToastContainer'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Anonymous routes */}
            <Route element={<AnonymousLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            
            {/* Protected routes - Wrap the entire MainLayout with ChatProvider */}
            <Route element={<ProtectedRoute />}>
              <Route element={
                <ChatProvider>
                  <MainLayout />
                </ChatProvider>
              }>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              
              {/* Admin routes - don't need ChatProvider */}
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/users/:userId" element={<AdminUserDetailsPage />} />
                </Route>
              </Route>
            </Route>
            
            {/* Redirect to login if not found */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
