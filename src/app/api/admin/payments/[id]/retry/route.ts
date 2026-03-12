import { NextRequest, NextResponse } from 'next/server';
import { AdminRetryPaymentUseCase } from '@/application/admin/AdminRetryPaymentUseCase';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaAuditLogRepository } from '@/infrastructure/repositories/AuditLogRepository.prisma';
import { YookassaGateway } from '@/infrastructure/payment/YookassaGateway';
import { randomUUID } from 'crypto';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const actorUserId = req.headers.get('x-user-id') ?? '';
    const actorRole = req.headers.get('x-user-role') ?? '';
    const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();

    try {
        const useCase = new AdminRetryPaymentUseCase(
            new PrismaPaymentRepository(),
            new PrismaOrderRepository(),
            new YookassaGateway(),
            new PrismaAuditLogRepository(),
        );

        const returnUrl = process.env.YOOKASSA_RETURN_URL ?? 'http://localhost:3000';
        const result = await useCase.execute({
            paymentId: id,
            actorUserId,
            actorRole,
            correlationId,
            returnUrl,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
