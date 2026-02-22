import { Product } from '@/domain/product/Product';

export interface ProductRepository {
    findById(id: string): Promise<Product | null>;
    findByIds(ids: string[]): Promise<Product[]>;
    findAll(): Promise<Product[]>;
    findByCategoryId(categoryId: string): Promise<Product[]>;
    save(product: Product): Promise<void>;
}
