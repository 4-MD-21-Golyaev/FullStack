import { ProductRepository } from '@/application/ports/ProductRepository';
import { Product } from '@/domain/product/Product';
import { prisma } from '../db/prismaClient';

export class PrismaProductRepository implements ProductRepository {

    async findById(id: string): Promise<Product | null> {
        const record = await prisma.product.findUnique({ where: { id } });

        if (!record) return null;

        return {
            id: record.id,
            name: record.name,
            article: record.article,
            price: record.price.toNumber(),
            stock: record.stock,
            imagePath: record.imagePath,
            categoryId: record.categoryId,
        };
    }

    async findAll(): Promise<Product[]> {
        const records = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });

        return records.map(record => ({
            id: record.id,
            name: record.name,
            article: record.article,
            price: record.price.toNumber(),
            stock: record.stock,
            imagePath: record.imagePath,
            categoryId: record.categoryId,
        }));
    }

    async findByCategoryId(categoryId: string): Promise<Product[]> {
        const records = await prisma.product.findMany({
            where: { categoryId },
            orderBy: { name: 'asc' },
        });

        return records.map(record => ({
            id: record.id,
            name: record.name,
            article: record.article,
            price: record.price.toNumber(),
            stock: record.stock,
            imagePath: record.imagePath,
            categoryId: record.categoryId,
        }));
    }

    async save(product: Product): Promise<void> {
        await prisma.product.update({
            where: { id: product.id },
            data: { stock: product.stock },
        });
    }
}
