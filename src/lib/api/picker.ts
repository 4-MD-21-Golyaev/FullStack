import { apiClient } from './client';
import type { OrderDto } from './orders';

export const pickerApi = {
  available: () =>
    apiClient.get<{ orders: OrderDto[] }>('/api/picker/orders/available'),

  myOrder: () =>
    apiClient.get<{ order: OrderDto | null }>('/api/picker/orders/me'),

  claim: (id: string) =>
    apiClient.post<OrderDto>(`/api/picker/orders/${id}/claim`),

  release: (id: string) =>
    apiClient.post<OrderDto>(`/api/picker/orders/${id}/release`),
};
