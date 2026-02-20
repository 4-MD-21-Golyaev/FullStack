import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { CancelOrderUseCase } from '@/application/order/CancelOrderUseCase';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
