import type { Category } from '@/domain/category/Category';
import type { CategoryRepository } from '@/application/ports/CategoryRepository';

export interface CatalogStructure {
  rootCategories: Category[];
  childrenByParent: Record<string, Category[]>;
}

export class GetCatalogStructureUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<CatalogStructure> {
    const all = await this.categoryRepository.findAll();

    const childrenByParent: Record<string, Category[]> = {};
    const rootCategories: Category[] = [];

    all.forEach(cat => {
      if (!cat.parentId) {
        rootCategories.push(cat);
        return;
      }
      if (!childrenByParent[cat.parentId]) {
        childrenByParent[cat.parentId] = [];
      }
      childrenByParent[cat.parentId].push(cat);
    });

    Object.values(childrenByParent).forEach(list => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { rootCategories, childrenByParent };
  }
}
