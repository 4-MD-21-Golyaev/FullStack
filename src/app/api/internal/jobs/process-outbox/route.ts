import { NextRequest, NextResponse } from 'next/server';
import { ProcessOutboxUseCase } from '@/application/order/ProcessOutboxUseCase';
import { PrismaOutboxRepository } from '@/infrastructure/repositories/OutboxRepository.prisma';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { HttpMoySkladGateway } from '@/infrastructure/moysklad/HttpMoySkladGateway';
import { assertInternalJobAuth } from '@/lib/internal-job-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = assertInternalJobAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const useCase = new ProcessOutboxUseCase(
            new PrismaOutboxRepository(),
            new HttpMoySkladGateway({
                token:          process.env.MOYSKLAD_TOKEN!,
                organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
                agentId:        process.env.MOYSKLAD_AGENT_ID!,
            }),
            new PrismaOrderRepository(),
        );
        const result = await useCase.execute();
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
