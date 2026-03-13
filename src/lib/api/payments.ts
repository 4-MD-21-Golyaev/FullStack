import { apiClient } from './client';
import type { PaymentStatus } from '@/domain/payment/PaymentStatus';

export interface PaymentIssueDto {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  externalId?: string | null;
  createdAt: string;
}

export interface AdminPaymentIssuesResponse {
  issues: PaymentIssueDto[];
  total: number;
}

export const paymentsApi = {
  adminIssues: () =>
    apiClient.get<AdminPaymentIssuesResponse>('/api/admin/payments/issues'),

  retry: (id: string) =>
    apiClient.post<void>(`/api/admin/payments/${id}/retry`),

  markFailed: (id: string, reason: string) =>
    apiClient.post<void>(`/api/admin/payments/${id}/mark-failed`, { reason }),
};
