import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import authService from './authService';
import { ApiError } from '../types/auth';

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
    return Promise.reject(new Error(formatApiError(error).message));
  }
);

// Response interceptor for handling errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle both 401 and 403 errors for token expiration
    if (!originalRequest || 
        (error.response?.status !== 401 && error.response?.status !== 403) || 
        (originalRequest as any)._retry) {
      return Promise.reject(new Error(formatApiError(error).message));
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
          return Promise.reject(new Error(formatApiError(err).message));
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
      processQueue(refreshError as Error, null);
      localStorage.removeItem('user');
      
      // Redirect to login only if in browser environment
      if (typeof window !== 'undefined') {
        window.location.href = '/login?session=expired';
      }
      return Promise.reject(new Error(formatApiError(refreshError).message));
      
    } finally {
      isRefreshing = false;
    }
  }
);

// Format API errors consistently
function formatApiError(error: unknown): ApiError {
  const apiError: ApiError = {
    message: 'An unknown error occurred',
    status: 500
  };
  
  if (axios.isAxiosError(error)) {
    apiError.status = error.response?.status ?? 500;
    
    if (error.response?.data) {
      const errorData = error.response?.data as { message?: string; error?: string; timestamp?: string; path?: string; details?: string };
      apiError.message = errorData.message ?? errorData.error ?? error.message;
      apiError.timestamp = errorData.timestamp;
      apiError.path = errorData.path;
      apiError.details = errorData.details;
    } else {
      apiError.message = error.message;
    }
    
    // Add request metadata
    if (error.config?.url) {
      apiError.path = error.config.url;
    }
  } else if (error instanceof Error) {
    apiError.message = error.message;
  } else if (typeof error === 'string') {
    apiError.message = error;
  }
  
  return apiError;
}

export default api;
