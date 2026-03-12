import { NextRequest, NextResponse } from 'next/server';
import { CourierMarkDeliveryFailedUseCase } from '@/application/courier/CourierMarkDeliveryFailedUseCase';
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

    let body: { reason?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    if (!body.reason) {
        return NextResponse.json({ message: 'reason is required' }, { status: 400 });
    }

    try {
        const useCase = new CourierMarkDeliveryFailedUseCase(new PrismaTransactionRunner());
        const order = await useCase.execute({
            orderId: id,
            userId,
            userRole,
            reason: body.reason,
            correlationId,
        });
        return NextResponse.json(order);
    } catch (error: any) {
        const status = error.message.includes('Only the assigned') ? 403 : 400;
        return NextResponse.json({ message: error.message }, { status });
    }
}
