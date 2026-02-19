import { NextRequest, NextResponse } from 'next/server';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productRepo = new PrismaProductRepository();
        const product = await productRepo.findById(id);

        if (!product) {
            return NextResponse.json(
                { message: 'Товар не найден' },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}
