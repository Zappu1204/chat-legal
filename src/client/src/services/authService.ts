import axios from 'axios';
import { JwtResponse, LoginRequest, LogoutRequest, RegisterRequest, MessageResponse } from '../types/auth';

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
  login: async (username: string, password: string): Promise<JwtResponse> => {
    const loginRequest: LoginRequest = { username, password };
    const response = await authAxios.post<JwtResponse>('/api/auth/login', loginRequest);
    return response.data;
  },
  
  register: async (registerData: RegisterRequest): Promise<MessageResponse> => {
    const response = await authAxios.post<MessageResponse>('/api/auth/register', registerData);
    return response.data;
  },
  
  logout: async (username: string): Promise<void> => {
    try {
      const logoutRequest: LogoutRequest = { username };
      await authAxios.post('/api/auth/logout', logoutRequest);
    } finally {
      // Always clear local storage on logout
      localStorage.removeItem('user');
    }
  },
  
  refreshToken: async (refreshToken: string): Promise<JwtResponse> => {
    const response = await authAxios.post<JwtResponse>('/api/auth/refresh', { refreshToken });
    return response.data;
  },
  
  // Helper method to check if the JWT token is expired
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check token expiration (exp is in seconds, Date.now() is in milliseconds)
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      // If we can't decode the token, assume it's expired
      return true;
    }
  },
  
  // Helper to get remaining token time in seconds
  getTokenRemainingTime: (token: string): number => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Return remaining time in seconds
      return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    } catch {
      return 0;
    }
  }
};

export default authService;
