import { NextRequest, NextResponse } from 'next/server';
import { CourierConfirmDeliveredUseCase } from '@/application/courier/CourierConfirmDeliveredUseCase';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { randomUUID } from 'crypto';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const userId = req.headers.get('x-user-id') ?? '';
    const userRole = req.headers.get('x-user-role') ?? '';
    const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();

    try {
        const useCase = new CourierConfirmDeliveredUseCase(new PrismaTransactionRunner());
        const order = await useCase.execute({ orderId: id, userId, userRole, correlationId });
        return NextResponse.json(order);
    } catch (error: any) {
        const status = error.message.includes('Only the assigned') ? 403 : 400;
        return NextResponse.json({ message: error.message }, { status });
    }
}
