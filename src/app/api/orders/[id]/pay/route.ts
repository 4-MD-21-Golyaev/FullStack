import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PayOrderUseCase } from '@/application/order/PayOrderUseCase';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const orderRepo = new PrismaOrderRepository();
        const paymentRepo = new PrismaPaymentRepository();
        const productRepo = new PrismaProductRepository();
        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        const result = await useCase.execute({ orderId: id });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
