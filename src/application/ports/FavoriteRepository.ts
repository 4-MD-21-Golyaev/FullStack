import { type FavoriteItem } from '@/domain/favorites/FavoriteItem';

export interface FavoriteRepository {
    findByUserId(userId: string): Promise<FavoriteItem[]>;
    findByUserAndProduct(userId: string, productId: string): Promise<FavoriteItem | null>;
    save(item: FavoriteItem): Promise<void>;
    remove(userId: string, productId: string): Promise<void>;
}
