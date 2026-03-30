import { randomUUID } from 'crypto';
import { UserAddressRepository } from '@/application/ports/UserAddressRepository';
import { UserAddress } from '@/domain/user/UserAddress';

export class SaveUserAddressUseCase {
    constructor(private repository: UserAddressRepository) {}

    async execute(input: { userId: string; address: string }): Promise<UserAddress> {
        if (!input.address || input.address.trim() === '') {
            throw new Error('Address must be a non-empty string');
        }

        const newAddress: UserAddress = {
            id: randomUUID(),
            userId: input.userId,
            address: input.address,
            createdAt: new Date(),
        };

        await this.repository.save(newAddress);
        return newAddress;
    }
}
