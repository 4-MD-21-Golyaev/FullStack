import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRemoveExecute = vi.fn();

vi.mock('@/application/favorites/RemoveFromFavoritesUseCase', () => ({
    RemoveFromFavoritesUseCase: class {
        execute = mockRemoveExecute;
    },
}));

vi.mock('@/infrastructure/repositories/FavoriteRepository.prisma', () => ({
    PrismaFavoriteRepository: class {},
}));

import { NextRequest } from 'next/server';
import { DELETE } from '../route';

const routeParams = { params: Promise.resolve({ productId: 'p1' }) };

function makeReq(headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/favorites/p1', {
        method: 'DELETE',
        headers,
    });
}

describe('DELETE /api/favorites/[productId]', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 401 when x-user-id is missing', async () => {
        const res = await DELETE(makeReq(), routeParams);
        expect(res.status).toBe(401);
        expect(mockRemoveExecute).not.toHaveBeenCalled();
    });

    it('returns 200 when removed successfully', async () => {
        mockRemoveExecute.mockResolvedValue(undefined);
        const res = await DELETE(makeReq({ 'x-user-id': 'u1' }), routeParams);
        expect(res.status).toBe(200);
        expect(mockRemoveExecute).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1' });
    });

    it('returns 400 when use case throws', async () => {
        mockRemoveExecute.mockRejectedValue(new Error('boom'));
        const res = await DELETE(makeReq({ 'x-user-id': 'u1' }), routeParams);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('boom');
    });
});
