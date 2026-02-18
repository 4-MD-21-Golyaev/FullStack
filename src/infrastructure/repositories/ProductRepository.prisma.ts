import { ProductRepository } from '@/application/ports/ProductRepository';
import { Product } from '@/domain/product/Product';
import { prisma } from '../db/prismaClient';

export class PrismaProductRepository implements ProductRepository {

    async findById(id: string): Promise<Product | null> {

        const record = await prisma.product.findUnique({
            where: { id }
        });

        if (!record) return null;

        return {
            id: record.id,
            name: record.name,
            article: record.article,
            price: record.price,
            stock: record.stock,
        };
    }
}
