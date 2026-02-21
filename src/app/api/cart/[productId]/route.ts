import { NextRequest, NextResponse } from 'next/server';
import { PrismaCartRepository } from '@/infrastructure/repositories/CartRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { UpdateCartItemUseCase } from '@/application/cart/UpdateCartItemUseCase';
import { RemoveFromCartUseCase } from '@/application/cart/RemoveFromCartUseCase';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params;
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const useCase = new UpdateCartItemUseCase(
            new PrismaCartRepository(),
            new PrismaProductRepository(),
        );
        await useCase.execute({ userId, productId, quantity: body.quantity });
        return NextResponse.json({ message: 'Cart item updated' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params;
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const useCase = new RemoveFromCartUseCase(new PrismaCartRepository());
        await useCase.execute({ userId, productId });
        return NextResponse.json({ message: 'Cart item removed' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
