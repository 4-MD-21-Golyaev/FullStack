import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { CreateOrderUseCase } from '@/application/order/CreateOrderUseCase';

export async function POST(req: NextRequest) {
    try {

        const body = await req.json();

        const orderRepo = new PrismaOrderRepository();
        const productRepo = new PrismaProductRepository();

        const useCase = new CreateOrderUseCase(orderRepo, productRepo);

        const order = await useCase.execute({
            userId: body.userId,
            address: body.address,
            items: body.items, // теперь только productId + quantity
        });

        return NextResponse.json(order, { status: 201 });

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
