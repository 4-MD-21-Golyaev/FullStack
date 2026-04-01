import { type UserAddressRepository } from '@/application/ports/UserAddressRepository';
import { type UserAddress } from '@/domain/user/UserAddress';

export class GetUserAddressesUseCase {
    constructor(private repository: UserAddressRepository) {}

    async execute(input: { userId: string }): Promise<UserAddress[]> {
        return this.repository.findByUserId(input.userId);
    }
}
