import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetExecute = vi.fn();
const mockAddExecute = vi.fn();

vi.mock('@/application/favorites/GetFavoritesUseCase', () => ({
    GetFavoritesUseCase: class {
        execute = mockGetExecute;
    },
}));

vi.mock('@/application/favorites/AddToFavoritesUseCase', () => ({
    AddToFavoritesUseCase: class {
        execute = mockAddExecute;
    },
}));

vi.mock('@/infrastructure/repositories/FavoriteRepository.prisma', () => ({
    PrismaFavoriteRepository: class {},
}));

vi.mock('@/infrastructure/repositories/ProductRepository.prisma', () => ({
    PrismaProductRepository: class {},
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

function makeGetReq(headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/favorites', {
        method: 'GET',
        headers,
    });
}

function makePostReq(body: unknown, headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/favorites', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    });
}

describe('GET /api/favorites', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 401 when x-user-id is missing', async () => {
        const res = await GET(makeGetReq());
        expect(res.status).toBe(401);
        expect(mockGetExecute).not.toHaveBeenCalled();
    });

    it('returns favorites list when authenticated', async () => {
        mockGetExecute.mockResolvedValue([{ id: 'p1', name: 'P1', price: 10, imagePath: null, stock: 1, categoryId: 'c1' }]);

        const res = await GET(makeGetReq({ 'x-user-id': 'u1' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual([{ id: 'p1', name: 'P1', price: 10, imagePath: null, stock: 1, categoryId: 'c1' }]);
        expect(mockGetExecute).toHaveBeenCalledWith('u1');
    });
});

describe('POST /api/favorites', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 401 when x-user-id is missing', async () => {
        const res = await POST(makePostReq({ productId: 'p1' }));
        expect(res.status).toBe(401);
        expect(mockAddExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when productId is invalid', async () => {
        const res = await POST(makePostReq({ productId: 123 }, { 'x-user-id': 'u1' }));
        expect(res.status).toBe(400);
        expect(mockAddExecute).not.toHaveBeenCalled();
    });

    it('returns 201 when added successfully', async () => {
        mockAddExecute.mockResolvedValue(undefined);
        const res = await POST(makePostReq({ productId: 'p1' }, { 'x-user-id': 'u1' }));
        expect(res.status).toBe(201);
        expect(mockAddExecute).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1' });
    });

    it('returns 400 when use case throws', async () => {
        mockAddExecute.mockRejectedValue(new Error('boom'));
        const res = await POST(makePostReq({ productId: 'p1' }, { 'x-user-id': 'u1' }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('boom');
    });
});
