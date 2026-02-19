import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { CancelOrderUseCase } from '@/application/order/CancelOrderUseCase';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const orderRepo = new PrismaOrderRepository();
        const useCase = new CancelOrderUseCase(orderRepo);

        const order = await useCase.execute({ orderId: id });

        return NextResponse.json(order);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
