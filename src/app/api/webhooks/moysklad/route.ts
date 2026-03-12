import { NextRequest, NextResponse } from 'next/server';
import { SyncProductsUseCase } from '@/application/product/SyncProductsUseCase';
import { HttpMoySkladGateway } from '@/infrastructure/moysklad/HttpMoySkladGateway';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/moysklad
 *
 * Принимает вебхук от МойСклад об изменении ассортимента.
 * В ответ запрашивает актуальные данные через МойСклад API и синхронизирует локальную БД.
 *
 * МойСклад webhook payload (упрощённо):
 * {
 *   "auditContext": { "uid": "...", "moment": "..." },
 *   "events": [{ "meta": { "type": "product", "href": "..." }, "action": "UPDATE" }]
 * }
 *
 * Система не обрабатывает конкретные события из payload — вместо этого выполняет полную
 * синхронизацию ассортимента, что гарантирует консистентность при любых изменениях.
 */
export async function POST(req: NextRequest) {
    // Читаем payload (для логирования), но полная синхронизация не зависит от его содержимого
    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        payload = null;
    }

    console.log('[MoySklad webhook] received', JSON.stringify(payload));

    try {
        const gateway = new HttpMoySkladGateway({
            token:          process.env.MOYSKLAD_TOKEN!,
            organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
            agentId:        process.env.MOYSKLAD_AGENT_ID!,
        });

        const useCase = new SyncProductsUseCase(
            gateway,
            new PrismaProductRepository(),
            new PrismaCategoryRepository(),
        );

        const result = await useCase.execute();
        console.log('[MoySklad webhook] sync result', result);

        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        console.error('[MoySklad webhook] sync failed', error.message);
        // Возвращаем 200 чтобы МойСклад не повторял отправку
        return NextResponse.json({ ok: false, error: error.message });
    }
}
