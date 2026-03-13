import { apiClient } from './client';
import type { OrderDto } from './orders';

export const courierApi = {
  available: () =>
    apiClient.get<{ orders: OrderDto[] }>('/api/courier/orders/available'),

  myOrder: () =>
    apiClient.get<{ order: OrderDto | null }>('/api/courier/orders/me'),

  claim: (id: string) =>
    apiClient.post<OrderDto>(`/api/courier/orders/${id}/claim`),

  release: (id: string) =>
    apiClient.post<OrderDto>(`/api/courier/orders/${id}/release`),

  startDelivery: (id: string) =>
    apiClient.post<OrderDto>(`/api/courier/orders/${id}/start-delivery`),

  confirmDelivered: (id: string) =>
    apiClient.post<OrderDto>(`/api/courier/orders/${id}/confirm-delivered`),

  markDeliveryFailed: (id: string, reason: string) =>
    apiClient.post<OrderDto>(`/api/courier/orders/${id}/mark-delivery-failed`, { reason }),
};
