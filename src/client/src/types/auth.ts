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
