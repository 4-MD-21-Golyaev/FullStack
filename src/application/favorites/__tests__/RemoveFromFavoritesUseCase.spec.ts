import { describe, it, expect, vi } from 'vitest';
import { RemoveFromFavoritesUseCase } from '../RemoveFromFavoritesUseCase';
import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';

function makeFavoriteRepo(): FavoriteRepository {
    return {
        findByUserId: vi.fn(),
        findByUserAndProduct: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
    };
}

describe('RemoveFromFavoritesUseCase', () => {
    it('does nothing when productId is missing', async () => {
        const repo = makeFavoriteRepo();
        const useCase = new RemoveFromFavoritesUseCase(repo);

        await useCase.execute({ userId: 'u1', productId: '' });

        expect(repo.remove).not.toHaveBeenCalled();
    });

    it('removes favorite when productId is provided', async () => {
        const repo = makeFavoriteRepo();
        const useCase = new RemoveFromFavoritesUseCase(repo);

        await useCase.execute({ userId: 'u1', productId: 'p1' });

        expect(repo.remove).toHaveBeenCalledWith('u1', 'p1');
    });
});
