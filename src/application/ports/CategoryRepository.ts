import { Category } from '@/domain/category/Category';

export interface CategoryRepository {
    findByParentId(parentId: string | null): Promise<Category[]>;
}
