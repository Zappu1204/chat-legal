// Auth response types
export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

// Auth request types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  roles?: string[];
}

export interface LogoutRequest {
  username: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
}

// User profile type
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface MessageResponse {
  message: string;
  success: boolean;
}

// Error type
export interface ApiError {
  message: string;
  status?: number;
  timestamp?: string;
  path?: string;
  details?: string;
}
