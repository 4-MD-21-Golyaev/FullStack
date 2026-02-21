import { CartItem } from '@/domain/cart/CartItem';

export interface CartRepository {
    findByUserId(userId: string): Promise<CartItem[]>;
    findByUserAndProduct(userId: string, productId: string): Promise<CartItem | null>;
    save(item: CartItem): Promise<void>;
    remove(userId: string, productId: string): Promise<void>;
    clear(userId: string): Promise<void>;
}
