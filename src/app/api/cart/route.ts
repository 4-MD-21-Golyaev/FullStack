import { type NextRequest, NextResponse } from 'next/server';
import { PrismaCartRepository } from '@/infrastructure/repositories/CartRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { GetCartUseCase } from '@/application/cart/GetCartUseCase';
import { AddToCartUseCase } from '@/application/cart/AddToCartUseCase';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const useCase = new GetCartUseCase(
        new PrismaCartRepository(),
        new PrismaProductRepository(),
    );
    const items = await useCase.execute(userId);
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const cartRepository = new PrismaCartRepository();
        const productRepository = new PrismaProductRepository();

        await new AddToCartUseCase(cartRepository, productRepository).execute({
            userId,
            productId: body.productId,
            quantity: body.quantity,
        });
        const cart = await new GetCartUseCase(cartRepository, productRepository).execute(userId);

        return NextResponse.json(cart, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
