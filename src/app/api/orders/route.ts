import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { CreateOrderUseCase } from '@/application/order/CreateOrderUseCase';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaCartRepository } from '@/infrastructure/repositories/CartRepository.prisma';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const orders = await new PrismaOrderRepository().findByUserId(userId);
    return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        const useCase = new CreateOrderUseCase(new PrismaTransactionRunner());

        const order = await useCase.execute({
            userId,
            address: body.address,
            absenceResolutionStrategy: body.absenceResolutionStrategy,
            items: body.items,
        });

        // Корзина — это незафиксированный заказ. После подтверждения очищаем её.
        await new PrismaCartRepository().clear(userId);

        return NextResponse.json(order, { status: 201 });

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
