import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserAddressesUseCase } from '../GetUserAddressesUseCase';
import { SaveUserAddressUseCase } from '../SaveUserAddressUseCase';
import { DeleteUserAddressUseCase } from '../DeleteUserAddressUseCase';
import { type UserAddressRepository } from '@/application/ports/UserAddressRepository';
import { type UserAddress } from '@/domain/user/UserAddress';

function makeRepo(overrides: Partial<UserAddressRepository> = {}): UserAddressRepository {
    return {
        findByUserId: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        findById: vi.fn().mockResolvedValue(null),
        ...overrides,
    };
}

const sampleAddress: UserAddress = {
    id: 'addr-1',
    userId: 'user-1',
    address: 'ул. Ленина, д. 1',
    createdAt: new Date('2024-01-01'),
};

describe('GetUserAddressesUseCase', () => {
    it('returns addresses for user', async () => {
        const repo = makeRepo({ findByUserId: vi.fn().mockResolvedValue([sampleAddress]) });
        const useCase = new GetUserAddressesUseCase(repo);
        const result = await useCase.execute({ userId: 'user-1' });
        expect(result).toEqual([sampleAddress]);
        expect(repo.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when user has no addresses', async () => {
        const repo = makeRepo({ findByUserId: vi.fn().mockResolvedValue([]) });
        const useCase = new GetUserAddressesUseCase(repo);
        const result = await useCase.execute({ userId: 'user-1' });
        expect(result).toEqual([]);
    });
});

describe('SaveUserAddressUseCase', () => {
    it('saves and returns new address with generated id', async () => {
        const repo = makeRepo();
        const useCase = new SaveUserAddressUseCase(repo);
        const result = await useCase.execute({ userId: 'user-1', address: 'ул. Ленина, д. 1' });

        expect(result.userId).toBe('user-1');
        expect(result.address).toBe('ул. Ленина, д. 1');
        expect(result.id).toBeTruthy();
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('throws on empty address string', async () => {
        const repo = makeRepo();
        const useCase = new SaveUserAddressUseCase(repo);
        await expect(useCase.execute({ userId: 'user-1', address: '' }))
            .rejects.toThrow('Address must be a non-empty string');
    });

    it('throws on whitespace-only address', async () => {
        const repo = makeRepo();
        const useCase = new SaveUserAddressUseCase(repo);
        await expect(useCase.execute({ userId: 'user-1', address: '   ' }))
            .rejects.toThrow('Address must be a non-empty string');
    });
});

describe('DeleteUserAddressUseCase', () => {
    it('deletes address when owner matches', async () => {
        const repo = makeRepo({ findById: vi.fn().mockResolvedValue(sampleAddress) });
        const useCase = new DeleteUserAddressUseCase(repo);
        await useCase.execute({ id: 'addr-1', userId: 'user-1' });
        expect(repo.delete).toHaveBeenCalledWith('addr-1', 'user-1');
    });

    it('looks up address by the provided id', async () => {
        const findById = vi.fn().mockResolvedValue(sampleAddress);
        const repo = makeRepo({ findById });
        const useCase = new DeleteUserAddressUseCase(repo);
        await useCase.execute({ id: 'addr-1', userId: 'user-1' });
        expect(findById).toHaveBeenCalledWith('addr-1');
    });

    it('throws Address not found when id does not exist', async () => {
        const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new DeleteUserAddressUseCase(repo);
        await expect(useCase.execute({ id: 'nonexistent', userId: 'user-1' }))
            .rejects.toThrow('Address not found');
    });

    it('does not call delete when address is not found', async () => {
        const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new DeleteUserAddressUseCase(repo);
        await expect(useCase.execute({ id: 'nonexistent', userId: 'user-1' }))
            .rejects.toThrow('Address not found');
        expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws Forbidden when userId does not match owner', async () => {
        const repo = makeRepo({ findById: vi.fn().mockResolvedValue(sampleAddress) });
        const useCase = new DeleteUserAddressUseCase(repo);
        await expect(useCase.execute({ id: 'addr-1', userId: 'other-user' }))
            .rejects.toThrow('Forbidden');
        expect(repo.delete).not.toHaveBeenCalled();
    });
});

describe('SaveUserAddressUseCase — additional edge cases', () => {
    it('generates a unique id for each saved address', async () => {
        const repo = makeRepo();
        const useCase = new SaveUserAddressUseCase(repo);
        const first = await useCase.execute({ userId: 'user-1', address: 'ул. Ленина, д. 1' });
        const second = await useCase.execute({ userId: 'user-1', address: 'пр. Мира, д. 5' });
        expect(first.id).not.toBe(second.id);
    });

    it('calls repository save exactly once per execute', async () => {
        const repo = makeRepo();
        const useCase = new SaveUserAddressUseCase(repo);
        await useCase.execute({ userId: 'user-1', address: 'ул. Ленина, д. 1' });
        expect(repo.save).toHaveBeenCalledTimes(1);
    });
});

describe('GetUserAddressesUseCase — additional cases', () => {
    it('returns multiple addresses for the same user', async () => {
        const addresses: UserAddress[] = [
            { id: 'addr-1', userId: 'user-1', address: 'ул. Ленина, д. 1', createdAt: new Date('2024-01-01') },
            { id: 'addr-2', userId: 'user-1', address: 'пр. Мира, д. 5', createdAt: new Date('2024-01-02') },
        ];
        const repo = makeRepo({ findByUserId: vi.fn().mockResolvedValue(addresses) });
        const useCase = new GetUserAddressesUseCase(repo);
        const result = await useCase.execute({ userId: 'user-1' });
        expect(result).toHaveLength(2);
        expect(result).toEqual(addresses);
    });
});
