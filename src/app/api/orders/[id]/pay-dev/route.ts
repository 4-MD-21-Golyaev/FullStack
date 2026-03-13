import { NextRequest, NextResponse } from 'next/server';
import { PayOrderUseCase } from '@/application/order/PayOrderUseCase';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';

/**
 * Dev-only: обходит платёжный шлюз и переводит заказ PAYMENT → DELIVERY_ASSIGNED.
 * Недоступен в production.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const useCase = new PayOrderUseCase(new PrismaTransactionRunner());
        const { order } = await useCase.execute({ orderId: id });
        return NextResponse.json(order);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
