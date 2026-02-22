import { OutboxRepository } from '@/application/ports/OutboxRepository';
import { MoySkladGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';

const MAX_RETRIES = 3;

interface ProcessOutboxResult {
    processed: number;
    retried: number;
    failed: number;
}

export class ProcessOutboxUseCase {
    constructor(
        private outboxRepository: OutboxRepository,
        private moySkladGateway: MoySkladGateway,
    ) {}

    async execute(): Promise<ProcessOutboxResult> {
        const events = await this.outboxRepository.findPending(MAX_RETRIES);
        let processed = 0;
        let retried = 0;
        let failed = 0;

        for (const event of events) {
            try {
                if (event.eventType === 'ORDER_DELIVERED') {
                    const { orderId, items } = event.payload as any;
                    await this.moySkladGateway.exportOrder(orderId, items);
                }
                await this.outboxRepository.markProcessed(event.id);
                processed++;
            } catch (err) {
                if (err instanceof MoySkladProductNotFoundError) {
                    // Бизнес-ошибка: повторы бессмысленны
                    await this.outboxRepository.markFailed(event.id, err.message);
                    console.error(`[Outbox] Permanent failure for event ${event.id}:`, err.message);
                    failed++;
                } else {
                    // Временная ошибка (сеть, 5xx): retry до MAX_RETRIES
                    const nextRetry = event.retryCount + 1;
                    if (nextRetry >= MAX_RETRIES) {
                        const msg = err instanceof Error ? err.message : String(err);
                        await this.outboxRepository.markFailed(event.id, msg);
                        console.error(`[Outbox] Max retries reached for event ${event.id}:`, msg);
                        failed++;
                    } else {
                        await this.outboxRepository.incrementRetry(event.id);
                        console.warn(`[Outbox] Retry ${nextRetry}/${MAX_RETRIES} for event ${event.id}`);
                        retried++;
                    }
                }
            }
        }

        return { processed, retried, failed };
    }
}
