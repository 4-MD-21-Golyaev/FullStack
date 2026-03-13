import { apiClient } from './client';

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  phone: string;
  address: string | null;
}

export interface VerifyCodeResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
}

export const authApi = {
  me: () => apiClient.get<MeResponse>('/api/auth/me'),

  requestCode: (email: string) =>
    apiClient.post<{ ok: boolean }>('/api/auth/request-code', { email }),

  verifyCode: (email: string, code: string) =>
    apiClient.post<VerifyCodeResponse>('/api/auth/verify-code', { email, code }),

  logout: () => apiClient.post<void>('/api/auth/logout'),

  refresh: () => apiClient.post<{ accessToken: string }>('/api/auth/refresh'),
};
