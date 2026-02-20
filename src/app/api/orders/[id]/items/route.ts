import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { UpdateOrderItemsUseCase } from '@/application/order/UpdateOrderItemsUseCase';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const useCase = new UpdateOrderItemsUseCase(new PrismaTransactionRunner());

        const order = await useCase.execute({
            orderId: id,
            items: body.items,
        });

        return NextResponse.json(order);

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 400 }
        );
    }
}
