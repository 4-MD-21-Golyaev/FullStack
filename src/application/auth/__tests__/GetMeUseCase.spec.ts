import { describe, it, expect, vi } from 'vitest';
import { GetMeUseCase } from '../GetMeUseCase';
import { UserRepository } from '@/application/ports/UserRepository';

const mockUser = { id: 'u1', email: 'a@b.com', role: 'CUSTOMER', phone: '+7', address: null };

function makeUserRepo(user: unknown = mockUser): UserRepository {
    return { findByEmail: vi.fn(), findById: vi.fn().mockResolvedValue(user), create: vi.fn() };
}

describe('GetMeUseCase', () => {
    it('returns user info when found', async () => {
        const uc = new GetMeUseCase(makeUserRepo());
        const result = await uc.execute({ userId: 'u1' });
        expect(result).toEqual(mockUser);
    });

    it('returns null when user not found', async () => {
        const uc = new GetMeUseCase(makeUserRepo(null));
        const result = await uc.execute({ userId: 'u1' });
        expect(result).toBeNull();
    });
});
