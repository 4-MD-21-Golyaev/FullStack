import { type UserAddress } from '@/domain/user/UserAddress';

export interface UserAddressRepository {
    findByUserId(userId: string): Promise<UserAddress[]>;
    save(address: UserAddress): Promise<void>;
    delete(id: string, userId: string): Promise<void>;
    findById(id: string): Promise<UserAddress | null>;
}
