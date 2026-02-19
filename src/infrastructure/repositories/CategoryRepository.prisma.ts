import { CategoryRepository } from '@/application/ports/CategoryRepository';
import { Category } from '@/domain/category/Category';
import { prisma } from '../db/prismaClient';

export class PrismaCategoryRepository implements CategoryRepository {

    async findByParentId(parentId: string | null): Promise<Category[]> {
        const records = await prisma.category.findMany({
            where: { parentId },
            orderBy: { name: 'asc' },
        });

        return records.map(record => ({
            id: record.id,
            name: record.name,
            imagePath: record.imagePath,
            parentId: record.parentId,
        }));
    }
}
