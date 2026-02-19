import { NextRequest, NextResponse } from 'next/server';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';

export async function GET(req: NextRequest) {
    try {
        const categoryId = req.nextUrl.searchParams.get('categoryId');

        const productRepo = new PrismaProductRepository();
        const products = categoryId
            ? await productRepo.findByCategoryId(categoryId)
            : await productRepo.findAll();

        const result = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            imagePath: p.imagePath,
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}
