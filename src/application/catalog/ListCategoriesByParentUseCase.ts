import type { Category } from '@/domain/category/Category';
import type { CategoryRepository } from '@/application/ports/CategoryRepository';

export class ListCategoriesByParentUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(parentId: string | null): Promise<Category[]> {
    return this.categoryRepository.findByParentId(parentId);
  }
}
