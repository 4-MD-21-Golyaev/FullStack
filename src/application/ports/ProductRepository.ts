import { type Product } from '@/domain/product/Product';

export interface ProductRepository {
    findById(id: string): Promise<Product | null>;
    findByIds(ids: string[]): Promise<Product[]>;
    findAll(): Promise<Product[]>;
    findByCategoryId(categoryId: string): Promise<Product[]>;
    findByCategoryIds(categoryIds: string[]): Promise<Product[]>;
    findByArticle(article: string): Promise<Product | null>;
    findBySearch(query: string, limit: number): Promise<Product[]>;
    save(product: Product): Promise<void>;
}
