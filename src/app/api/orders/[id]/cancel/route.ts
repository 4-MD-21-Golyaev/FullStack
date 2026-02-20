import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { CancelOrderUseCase } from '@/application/order/CancelOrderUseCase';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = req.headers.get('x-user-id');
        const userRole = req.headers.get('x-user-role');

        // CUSTOMER can only cancel their own orders
        if (userRole === 'CUSTOMER') {
            const orderRepo = new PrismaOrderRepository();
            const order = await orderRepo.findById(id);
            if (!order) {
                return NextResponse.json({ message: 'Order not found' }, { status: 404 });
            }
            if (order.userId !== userId) {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
            }
        }

        const useCase = new CancelOrderUseCase(new PrismaTransactionRunner());
        const order = await useCase.execute({ orderId: id });

        return NextResponse.json(order);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
