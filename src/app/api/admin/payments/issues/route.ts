import { NextRequest, NextResponse } from 'next/server';
import { AdminPaymentIssuesUseCase } from '@/application/admin/AdminPaymentIssuesUseCase';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    try {
        const useCase = new AdminPaymentIssuesUseCase(
            new PrismaPaymentRepository(),
            new PrismaOrderRepository(),
        );
        const issues = await useCase.execute();
        return NextResponse.json(issues);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
