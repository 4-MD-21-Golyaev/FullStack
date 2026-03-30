import { UserAddressRepository } from '@/application/ports/UserAddressRepository';

export class DeleteUserAddressUseCase {
    constructor(private repository: UserAddressRepository) {}

    async execute(input: { id: string; userId: string }): Promise<void> {
        const address = await this.repository.findById(input.id);

        if (!address) {
            throw new Error('Address not found');
        }

        if (address.userId !== input.userId) {
            throw new Error('Forbidden');
        }

        await this.repository.delete(input.id, input.userId);
    }
}
