import type { PrismaClient, Prisma } from '@prisma/client';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { Product } from '@/domain/product/Product';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaProductRepository implements ProductRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findById(id: string): Promise<Product | null> {
        const record = await this.db.product.findUnique({ where: { id } });

        if (!record) return null;

        return this.toProduct(record);
    }

    async findAll(): Promise<Product[]> {
        const records = await this.db.product.findMany({
            orderBy: { name: 'asc' },
        });

        return records.map(r => this.toProduct(r));
    }

    async findByCategoryId(categoryId: string): Promise<Product[]> {
        const records = await this.db.product.findMany({
            where: { categoryId },
            orderBy: { name: 'asc' },
        });

        return records.map(r => this.toProduct(r));
    }

    async save(product: Product): Promise<void> {
        await this.db.product.update({
            where: { id: product.id },
            data: { stock: product.stock },
        });
    }

    private toProduct(record: any): Product {
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
}
