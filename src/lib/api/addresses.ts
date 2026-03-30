import { apiClient } from './client';

export interface UserAddressDto {
  id: string;
  userId: string;
  address: string;
  createdAt: string;
}

export const addressesApi = {
  list: () => apiClient.get<UserAddressDto[]>('/api/user/addresses'),
  save: (address: string) => apiClient.post<UserAddressDto>('/api/user/addresses', { address }),
  delete: (id: string) => apiClient.delete<void>(`/api/user/addresses/${id}`),
};
