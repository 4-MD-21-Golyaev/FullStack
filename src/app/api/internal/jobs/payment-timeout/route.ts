import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { PaymentTimeoutUseCase } from '@/application/order/PaymentTimeoutUseCase';
import { assertInternalJobAuth } from '@/lib/internal-job-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = assertInternalJobAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const useCase = new PaymentTimeoutUseCase(
            new PrismaPaymentRepository(),
            new PrismaTransactionRunner(),
        );
        const result = await useCase.execute();
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
