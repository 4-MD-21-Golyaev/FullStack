import { apiClient } from './client';

export interface UserDto {
  id: string;
  email: string;
  phone: string;
  role: string;
  address: string | null;
  createdAt: string;
}

export interface UsersResponse {
  users: UserDto[];
  total: number;
}

export const usersApi = {
  list: (params: { limit?: number; offset?: number } = {}) => {
    const url = new URL('/api/admin/users', window.location.origin);
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset));
    return apiClient.get<UsersResponse>(url.pathname + url.search);
  },

  getUser: (id: string) => apiClient.get<UserDto>(`/api/admin/users/${id}`),
};
