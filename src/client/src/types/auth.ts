export interface LoginRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface LogoutRequest {
  username: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  roles?: string[];
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
