import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import authService from './authService';

// More robust way to get API base URL
const getApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return envBaseUrl || 'http://localhost:8080';
};

const BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
// Store pending requests that should be retried after token refresh
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void }[] = [];

// Process the failed queue - either resolve or reject all pending requests
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData?.accessToken) {
          config.headers.Authorization = `Bearer ${userData.accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// Response interceptor for handling errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // If there's no config or the error is not 401, or we've already retried, reject immediately
    if (!originalRequest || error.response?.status !== 401 || (originalRequest as any)._retry) {
      return Promise.reject(error);
    }

    // Mark this request as retried to avoid infinite loops
    (originalRequest as any)._retry = true;

    // If already refreshing, add to queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    // Start refreshing
    isRefreshing = true;

    try {
      // Get refresh token from storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('No user data available');
      }

      const userData = JSON.parse(userStr);
      if (!userData.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Attempt to refresh token
      const response = await authService.refreshToken(userData.refreshToken);
      
      // Store the new tokens
      userData.accessToken = response.accessToken;
      userData.refreshToken = response.refreshToken;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update request authorization header
      originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
      
      // Process any other requests that failed while refreshing
      processQueue(null, response.accessToken);
      
      // Retry the original request
      return axios(originalRequest);
      
    } catch (refreshError) {
      // Refresh token failed - could be expired too, log user out
      processQueue(refreshError as Error);
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshError);
      
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
