import { NextRequest, NextResponse } from 'next/server';
import { CourierReleaseOrderUseCase } from '@/application/courier/CourierReleaseOrderUseCase';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaAuditLogRepository } from '@/infrastructure/repositories/AuditLogRepository.prisma';
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

    try {
        const useCase = new CourierReleaseOrderUseCase(
            new PrismaOrderRepository(),
            new PrismaAuditLogRepository(),
        );
        await useCase.execute({ orderId: id, userId, userRole, reason: body.reason, correlationId });
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        const status = error.message.includes('Forbidden') || error.message.includes('override') ? 403 : 400;
        return NextResponse.json({ message: error.message }, { status });
    }
}
