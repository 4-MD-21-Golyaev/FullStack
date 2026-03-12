import { CategoryRepository } from '@/application/ports/CategoryRepository';
import { Category } from '@/domain/category/Category';
import { prisma } from '../db/prismaClient';

export class PrismaCategoryRepository implements CategoryRepository {

    async findByParentId(parentId: string | null): Promise<Category[]> {
        const records = await prisma.category.findMany({
            where: { parentId },
            orderBy: { name: 'asc' },
        });

        return records.map(r => this.toCategory(r));
    }

    async findAll(): Promise<Category[]> {
        const records = await prisma.category.findMany({ orderBy: { name: 'asc' } });
        return records.map(r => this.toCategory(r));
    }

    async findByNameAndParent(name: string, parentId: string | null): Promise<Category | null> {
        const record = await prisma.category.findFirst({ where: { name, parentId } });
        return record ? this.toCategory(record) : null;
    }

    async save(category: Category): Promise<void> {
        await prisma.category.upsert({
            where: { id: category.id },
            update: { name: category.name, parentId: category.parentId, imagePath: category.imagePath },
            create: { id: category.id, name: category.name, parentId: category.parentId, imagePath: category.imagePath },
        });
    }

    private toCategory(record: any): Category {
        return {
            id:        record.id,
            name:      record.name,
            imagePath: record.imagePath,
            parentId:  record.parentId,
        };
    }
}
