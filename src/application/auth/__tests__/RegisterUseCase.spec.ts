import { describe, it, expect, vi } from 'vitest';
import { RegisterUseCase } from '../RegisterUseCase';
import { UserRepository } from '@/application/ports/UserRepository';
import { UserAlreadyExistsError } from '@/domain/auth/errors';

function makeUserRepo(existing: unknown = null): UserRepository {
    return {
        findByEmail: vi.fn().mockResolvedValue(existing),
        findById: vi.fn(),
        create: vi.fn().mockImplementation((data) =>
            Promise.resolve({ id: 'new-id', ...data }),
        ),
    };
}

describe('RegisterUseCase', () => {
    it('creates a user with role CUSTOMER', async () => {
        const repo = makeUserRepo(null);
        const uc = new RegisterUseCase(repo);

        const result = await uc.execute({ email: 'a@b.com', phone: '+7' });

        expect(result).toEqual({ id: 'new-id', email: 'a@b.com' });
        expect(repo.create).toHaveBeenCalledWith({
            email: 'a@b.com',
            phone: '+7',
            address: null,
            role: 'CUSTOMER',
        });
    });

    it('throws UserAlreadyExistsError when email taken', async () => {
        const repo = makeUserRepo({ id: 'x', email: 'a@b.com' });
        const uc = new RegisterUseCase(repo);

        await expect(uc.execute({ email: 'a@b.com', phone: '+7' }))
            .rejects.toThrow(UserAlreadyExistsError);
    });
});
