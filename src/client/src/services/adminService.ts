import api from './api';

// Type definitions for admin data
export interface UserAdminData {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  phoneNumber: string | null;
  isActive: boolean;
  lockedUntil: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  chatCount: number;
  messageCount: number;
  lastActivity: string | null;
}

export interface UserStatusUpdateRequest {
  isActive: boolean;
  lockedUntil?: string | null;
  reason?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

const adminService = {
  /**
   * List all users with pagination and search
   */
  getUsers: async (
    page: number = 0,
    size: number = 10,
    search?: string,
    isActive?: boolean
  ): Promise<PageResponse<UserAdminData>> => {
    let url = `/api/admin/users?page=${page}&size=${size}`;
    
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    if (isActive !== undefined) {
      url += `&isActive=${isActive}`;
    }
    
    const response = await api.get<PageResponse<UserAdminData>>(url);
    return response.data;
  },

  /**
   * Get details for a specific user
   */
  getUserDetails: async (userId: string): Promise<UserAdminData> => {
    const response = await api.get<UserAdminData>(`/api/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Update a user's active status
   */
  updateUserStatus: async (
    userId: string,
    statusUpdate: UserStatusUpdateRequest
  ): Promise<{ message: string; success: boolean }> => {
    const response = await api.patch<{ message: string; success: boolean }>(
      `/api/admin/users/${userId}/status`,
      statusUpdate
    );
    return response.data;
  },
};

export default adminService;
