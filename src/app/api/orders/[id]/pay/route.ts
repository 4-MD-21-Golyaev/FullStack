import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
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
        const productRepo = new PrismaProductRepository();
        const gateway = new YookassaGateway();

        const useCase = new InitiatePaymentUseCase(
            orderRepo,
            paymentRepo,
            productRepo,
            gateway
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
