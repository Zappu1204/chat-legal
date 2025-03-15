import api from './api';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  MessageResponse 
} from '../types/auth';

const userService = {
  /**
   * Get the current user's profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/api/users/profile/me');
    return response.data;
  },

  /**
   * Update the current user's profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await api.put<UserProfile>('/api/users/profile/me', data);
    return response.data;
  },

  /**
   * Change the current user's password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/api/users/profile/change-password', data);
    return response.data;
  },

  /**
   * Update the current user's avatar
   */
  updateAvatar: async (avatarUrl: string): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>('/api/users/profile/avatar', avatarUrl);
    return response.data;
  }
};

export default userService;
