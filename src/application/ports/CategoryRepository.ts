import { Category } from '@/domain/category/Category';

export interface CategoryRepository {
    findByParentId(parentId: string | null): Promise<Category[]>;
    findAll(): Promise<Category[]>;
    findByNameAndParent(name: string, parentId: string | null): Promise<Category | null>;
    save(category: Category): Promise<void>;
}
