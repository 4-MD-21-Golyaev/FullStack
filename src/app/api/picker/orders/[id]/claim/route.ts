import { NextRequest, NextResponse } from 'next/server';
import { PickerClaimOrderUseCase } from '@/application/picker/PickerClaimOrderUseCase';
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

    try {
        const useCase = new PickerClaimOrderUseCase(
            new PrismaOrderRepository(),
            new PrismaAuditLogRepository(),
        );
        await useCase.execute({ orderId: id, userId, userRole, correlationId });
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        const status = error.message.includes('already claimed') ? 409 : 400;
        return NextResponse.json({ message: error.message }, { status });
    }
}
