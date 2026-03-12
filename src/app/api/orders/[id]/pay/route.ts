import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { YookassaGateway } from '@/infrastructure/payment/YookassaGateway';
import { InitiatePaymentUseCase } from '@/application/order/InitiatePaymentUseCase';
import { PaymentAlreadyInProgressError } from '@/domain/payment/errors';

const RETURN_URL = process.env.YOOKASSA_RETURN_URL ?? 'http://localhost:3000';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Ownership check: load order before running business logic
    const orderRepo = new PrismaOrderRepository();
    const order = await orderRepo.findById(id);
    if (!order) {
        return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const paymentRepo = new PrismaPaymentRepository();
        const gateway = new YookassaGateway();
        const transactionRunner = new PrismaTransactionRunner();

        const useCase = new InitiatePaymentUseCase(
            orderRepo,
            paymentRepo,
            gateway,
            transactionRunner,
        );

        const result = await useCase.execute({
            orderId: id,
            returnUrl: `${RETURN_URL}/orders/${id}/result`,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        if (error instanceof PaymentAlreadyInProgressError) {
            return NextResponse.json({ message: error.message }, { status: 409 });
        }
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
