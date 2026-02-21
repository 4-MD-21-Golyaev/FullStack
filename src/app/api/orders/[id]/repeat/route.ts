import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaCartRepository } from '@/infrastructure/repositories/CartRepository.prisma';
import { RepeatOrderToCartUseCase } from '@/application/order/RepeatOrderToCartUseCase';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');

    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const useCase = new RepeatOrderToCartUseCase(
            new PrismaOrderRepository(),
            new PrismaCartRepository(),
        );
        const result = await useCase.execute({ orderId: id, userId });

        return NextResponse.json(result);
    } catch (error: any) {
        if (error.message === 'Forbidden') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (error.message === 'Order not found') {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
