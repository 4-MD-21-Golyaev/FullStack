import { Product } from '@/domain/product/Product';

export interface ProductRepository {
    findById(id: string): Promise<Product | null>;
    findAll(): Promise<Product[]>;
    findByCategoryId(categoryId: string): Promise<Product[]>;
    save(product: Product): Promise<void>;
}
