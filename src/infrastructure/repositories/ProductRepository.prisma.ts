import type { PrismaClient, Prisma } from '@prisma/client';
import { LockableProductRepository } from '@/application/ports/TransactionRunner';
import { Product } from '@/domain/product/Product';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaProductRepository implements LockableProductRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findById(id: string): Promise<Product | null> {
        const record = await this.db.product.findUnique({ where: { id } });

        if (!record) return null;

        return this.toProduct(record);
    }

    async findByIdWithLock(id: string): Promise<Product | null> {
        await this.db.$executeRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
        return this.findById(id);
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
