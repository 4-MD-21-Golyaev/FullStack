import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { CreateOrderUseCase } from '@/application/order/CreateOrderUseCase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const useCase = new CreateOrderUseCase(new PrismaTransactionRunner());

        const order = await useCase.execute({
            userId: body.userId,
            address: body.address,
            absenceResolutionStrategy: body.absenceResolutionStrategy,
            items: body.items,
        });

        return NextResponse.json(order, { status: 201 });

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
