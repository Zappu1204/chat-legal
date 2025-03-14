import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import AnonymousLayout from './layouts/AnonymousLayout'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
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
              {/* Add more routes here */}
            </Route>
          </Route>
          
          {/* Redirect to login if not found */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
