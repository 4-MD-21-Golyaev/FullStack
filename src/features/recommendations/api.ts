'use client';

export interface Category {
    id: string;
    name: string;
    imagePath: string | null;
    parentId: string | null;
}

export interface Product {
    id: string;
    name: string;
    article: string;
    price: number;
    stock: number;
    imagePath: string | null;
    categoryId: string;
}

export interface TopCategoriesResponse {
    items: Category[];
    personalized: false;
    fallbackUsed: false;
}

export interface PersonalizedCategoriesResponse {
    items: Category[];
    personalized: boolean;
    fallbackUsed: boolean;
}

export interface PersonalizedProductsResponse {
    items: Product[];
    personalized: boolean;
    fallbackUsed: boolean;
}

export interface RelatedProductsResponse {
    items: Product[];
    personalized: false;
    fallbackUsed: boolean;
}

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(res.statusText || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export async function fetchTopCategories(limit: number): Promise<TopCategoriesResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return getJson<TopCategoriesResponse>(`/api/recommendations/top-categories?${params.toString()}`);
}

export async function fetchPersonalizedCategories(limit: number): Promise<PersonalizedCategoriesResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return getJson<PersonalizedCategoriesResponse>(`/api/recommendations/categories?${params.toString()}`);
}

export async function fetchPersonalizedProducts(opts: {
    categoryId?: string | null;
    limit: number;
}): Promise<PersonalizedProductsResponse> {
    const params = new URLSearchParams({ limit: String(opts.limit) });
    if (opts.categoryId) params.set('categoryId', opts.categoryId);
    return getJson<PersonalizedProductsResponse>(`/api/recommendations/products?${params.toString()}`);
}

export async function fetchRelatedProducts(productId: string, limit: number): Promise<RelatedProductsResponse> {
    const params = new URLSearchParams({ productId, limit: String(limit) });
    return getJson<RelatedProductsResponse>(`/api/recommendations/related?${params.toString()}`);
}
