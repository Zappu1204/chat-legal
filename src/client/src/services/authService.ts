import axios from 'axios';
import { JwtResponse, RegisterRequest, MessageResponse, LogoutRequest, RefreshTokenRequest, LoginRequest } from '../types/auth';

// Get the base URL from environment or use default
const getApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return envBaseUrl || 'http://localhost:8080';
};

// Create a separate instance to avoid circular dependency with api.ts
const authAxios = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

const authService = {
  /**
   * Login a user with username and password
   */
  login: async (username: string, password: string): Promise<JwtResponse> => {
    try {
      const loginRequest: LoginRequest = { username, password };
      const response = await authAxios.post<JwtResponse>('/api/auth/login', loginRequest);
      return response.data;
    } catch (error: any) {
      // Extract error message from response for display
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Check if there are detailed error information
        if (errorData.details) {
          throw new Error(errorData.details);
        } else if (errorData.message) {
          throw new Error(errorData.message);
        } else {
          throw new Error('Login failed');
        }
      }
      throw error;
    }
  },
  
  /**
   * Register a new user
   */
  register: async (registerData: RegisterRequest): Promise<MessageResponse> => {
    const response = await authAxios.post<MessageResponse>('/api/auth/register', registerData);
    return response.data;
  },
  
  /**
   * Logout the current user
   */
  logout: async (username: string): Promise<void> => {
    try {
      const logoutRequest: LogoutRequest = { username };
      await authAxios.post('/api/auth/logout', logoutRequest);
    } finally {
      // Always clear local storage on logout
      localStorage.removeItem('user');
    }
  },
  
  /**
   * Refresh the access token using a refresh token
   * This is called by the API interceptor when a 401 error occurs
   */
  refreshToken: async (refreshToken: string): Promise<JwtResponse> => {
    try {
      const request: RefreshTokenRequest = { refreshToken };
      const response = await authAxios.post<JwtResponse>('/api/auth/refresh', request);
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Let the caller handle the error
      throw error;
    }
  },
  
  /**
   * Check if a JWT token is expired
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check token expiration with 30 seconds buffer
      return (payload.exp * 1000) < (Date.now() - 30000);
    } catch (e) {
      console.error('Error parsing token:', e);
      return true; // If we can't parse the token, assume it's expired
    }
  }
};

export default authService;
