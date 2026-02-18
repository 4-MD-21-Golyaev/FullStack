import { Product } from '@/domain/product/Product';

export interface ProductRepository {
    findById(id: string): Promise<Product | null>;
}
