import { NextRequest, NextResponse } from 'next/server';
import { ProcessOutboxUseCase } from '@/application/order/ProcessOutboxUseCase';
import { PrismaOutboxRepository } from '@/infrastructure/repositories/OutboxRepository.prisma';
import { HttpMoySkladGateway } from '@/infrastructure/moysklad/HttpMoySkladGateway';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    // Авторизация обрабатывается в proxy.ts
    try {
        const useCase = new ProcessOutboxUseCase(
            new PrismaOutboxRepository(),
            new HttpMoySkladGateway({
                token:          process.env.MOYSKLAD_TOKEN!,
                organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
                agentId:        process.env.MOYSKLAD_AGENT_ID!,
            }),
        );
        const result = await useCase.execute();
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
