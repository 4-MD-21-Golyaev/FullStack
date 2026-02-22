import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { YookassaGateway } from '@/infrastructure/payment/YookassaGateway';
import { InitiatePaymentUseCase } from '@/application/order/InitiatePaymentUseCase';

const RETURN_URL = process.env.YOOKASSA_RETURN_URL ?? 'http://localhost:3000';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const orderRepo = new PrismaOrderRepository();
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
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
