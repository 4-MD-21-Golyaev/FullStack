import { apiClient } from './client';
import type { OrderState } from '@/domain/order/OrderState';
import type { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import type { PaymentStatus } from '@/domain/payment/PaymentStatus';

export interface OrderItemDto {
  productId: string;
  name: string;
  article: string;
  price: number;
  quantity: number;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  externalId?: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  userId: string;
  items: OrderItemDto[];
  totalAmount: number;
  state: OrderState;
  address: string;
  absenceResolutionStrategy: AbsenceResolutionStrategy;
  customerPhone?: string | null;
  pickerClaimUserId?: string | null;
  pickerClaimedAt?: string | null;
  deliveryClaimUserId?: string | null;
  deliveryClaimedAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: PaymentDto | null;
}

export interface AdminOrdersParams {
  status?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdminOrdersResponse {
  orders: OrderDto[];
  total: number;
}

export const ordersApi = {
  getOrder: (id: string) => apiClient.get<OrderDto>(`/api/orders/${id}`),

  adminList: (params: AdminOrdersParams = {}) => {
    const url = new URL('/api/admin/orders', window.location.origin);
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      statuses.forEach((s) => url.searchParams.append('status', s));
    }
    if (params.dateFrom) url.searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) url.searchParams.set('dateTo', params.dateTo);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset));
    return apiClient.get<AdminOrdersResponse>(url.pathname + url.search);
  },

  cancelOrder: (id: string, reason?: string) =>
    apiClient.post<OrderDto>(`/api/orders/${id}/cancel`, { reason }),

  closeOrder: (id: string) =>
    apiClient.post<OrderDto>(`/api/orders/${id}/close`),

  updateItems: (id: string, items: OrderItemDto[]) =>
    apiClient.put<OrderDto>(`/api/orders/${id}/items`, { items }),

  startPicking: (id: string) =>
    apiClient.post<OrderDto>(`/api/orders/${id}/start-picking`),

  completePicking: (id: string) =>
    apiClient.post<OrderDto>(`/api/orders/${id}/complete-picking`),
};
