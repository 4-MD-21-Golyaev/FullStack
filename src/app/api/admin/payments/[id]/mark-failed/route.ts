import { NextRequest, NextResponse } from 'next/server';
import { AdminMarkPaymentFailedUseCase } from '@/application/admin/AdminMarkPaymentFailedUseCase';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { randomUUID } from 'crypto';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const actorUserId = req.headers.get('x-user-id') ?? '';
    const actorRole = req.headers.get('x-user-role') ?? '';
    const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();

    let body: { reason?: string } = {};
    try {
        body = await req.json();
    } catch {
        // no body
    }

    if (!body.reason) {
        return NextResponse.json({ message: 'reason is required' }, { status: 400 });
    }

    try {
        const useCase = new AdminMarkPaymentFailedUseCase(new PrismaTransactionRunner());
        await useCase.execute({
            paymentId: id,
            reason: body.reason,
            actorUserId,
            actorRole,
            correlationId,
        });
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
