import { apiClient } from './client';

export interface ProductDto {
  id: string;
  name: string;
  article: string;
  price: number;
  stock: number;
  imagePath: string | null;
  categoryId: string;
  categoryName?: string;
  active?: boolean;
}

export interface ProductsResponse {
  products: ProductDto[];
  total: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  imagePath: string | null;
  parentId: string | null;
  children?: CategoryDto[];
}

export const productsApi = {
  list: (params: { search?: string; categoryId?: string; limit?: number; offset?: number } = {}) => {
    const url = new URL('/api/products', window.location.origin);
    if (params.search) url.searchParams.set('search', params.search);
    if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset));
    return apiClient.get<ProductsResponse>(url.pathname + url.search);
  },

  syncProducts: () =>
    apiClient.post<{ ok: boolean; result?: unknown }>('/api/internal/jobs/sync-products'),

  categories: () => apiClient.get<{ categories: CategoryDto[] }>('/api/categories'),
};
