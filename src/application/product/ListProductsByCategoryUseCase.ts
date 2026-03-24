import type { Product } from '@/domain/product/Product';
import type { ProductRepository } from '@/application/ports/ProductRepository';

export class ListProductsByCategoryUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(categoryId: string): Promise<Product[]> {
    return this.productRepository.findByCategoryId(categoryId);
  }
}
