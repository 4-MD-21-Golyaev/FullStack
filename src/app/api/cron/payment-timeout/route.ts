import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { PaymentTimeoutUseCase } from '@/application/order/PaymentTimeoutUseCase';

export async function POST(req: NextRequest) {
    // Defense-in-depth: proxy already validates CRON_SECRET, but double-check here
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET || req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const useCase = new PaymentTimeoutUseCase(
        new PrismaPaymentRepository(),
        new PrismaTransactionRunner(),
    );

    const result = await useCase.execute();

    return NextResponse.json(result);
}
