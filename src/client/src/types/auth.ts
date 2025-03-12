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

export interface ApiError {
  message: string;
  status: number;
}
