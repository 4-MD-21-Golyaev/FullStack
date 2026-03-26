import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { CompletePickingUseCase } from '@/application/order/CompletePickingUseCase';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const unprocessedProductIds: string[] = Array.isArray(body.unprocessedProductIds) ? body.unprocessedProductIds : [];

        const useCase = new CompletePickingUseCase(new PrismaTransactionRunner());

        const order = await useCase.execute({ orderId: id, unprocessedProductIds });

        return NextResponse.json(order);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
