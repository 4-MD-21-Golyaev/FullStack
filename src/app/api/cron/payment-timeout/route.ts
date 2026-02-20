import { NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { PaymentTimeoutUseCase } from '@/application/order/PaymentTimeoutUseCase';

export async function POST() {
    const useCase = new PaymentTimeoutUseCase(
        new PrismaPaymentRepository(),
        new PrismaTransactionRunner(),
    );

    const result = await useCase.execute();

    return NextResponse.json(result);
}
