import { OutboxRepository } from '@/application/ports/OutboxRepository';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { MoySkladOrderGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladOrderGateway';
import { OutboxPrerequisiteNotReadyError } from './errors/OutboxPrerequisiteNotReadyError';

const MAX_RETRIES = 3;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000; // release stale claims after 5 minutes

interface ProcessOutboxResult {
    processed: number;
    retried: number;
    failed: number;
}

export class ProcessOutboxUseCase {
    constructor(
        private outboxRepository: OutboxRepository,
        private moySkladGateway: MoySkladOrderGateway,
        private orderRepository: OrderRepository,
    ) {}

    async execute(): Promise<ProcessOutboxResult> {
        const now = new Date();
        const staleAfter = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
        const events = await this.outboxRepository.claimPending(MAX_RETRIES, now, staleAfter);
        let processed = 0;
        let retried = 0;
        let failed = 0;

        for (const event of events) {
            try {
                await this.dispatch(event.eventType, event.payload);
                await this.outboxRepository.markProcessed(event.id);
                processed++;
            } catch (err) {
                if (err instanceof OutboxPrerequisiteNotReadyError) {
                    // Prerequisite not yet processed — always retry, ignore MAX_RETRIES
                    await this.outboxRepository.incrementRetry(event.id);
                    console.warn(`[Outbox] Prerequisite not ready for event ${event.id}: ${err.message}`);
                    retried++;
                } else if (err instanceof MoySkladProductNotFoundError) {
                    await this.outboxRepository.markFailed(event.id, err.message);
                    console.error(`[Outbox] Permanent failure for event ${event.id}:`, err.message);
                    failed++;
                } else {
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

    private async dispatch(eventType: string, payload: unknown): Promise<void> {
        const p = payload as any;

        switch (eventType) {
            case 'ORDER_CREATED': {
                const moySkladId = await this.moySkladGateway.createCustomerOrder(
                    p.orderId, p.items, p.totalAmount,
                );
                const order = await this.orderRepository.findById(p.orderId);
                if (order) {
                    order.moySkladId = moySkladId;
                    await this.orderRepository.save(order);
                }
                break;
            }
            case 'ORDER_PICKED': {
                const order = await this.orderRepository.findById(p.orderId);
                if (!order?.moySkladId) {
                    throw new OutboxPrerequisiteNotReadyError('ORDER_PICKED', 'moySkladId is null');
                }
                await this.moySkladGateway.updateCustomerOrder(order.moySkladId, p.items, p.totalAmount);
                break;
            }
            case 'PAYMENT_RECEIVED': {
                const order = await this.orderRepository.findById(p.orderId);
                if (!order?.moySkladId) {
                    throw new OutboxPrerequisiteNotReadyError('PAYMENT_RECEIVED', 'moySkladId is null');
                }
                await this.moySkladGateway.createPaymentIn(order.moySkladId, p.amount, p.orderId);
                break;
            }
            case 'ORDER_COMPLETED': {
                const order = await this.orderRepository.findById(p.orderId);
                if (!order?.moySkladId) {
                    throw new OutboxPrerequisiteNotReadyError('ORDER_COMPLETED', 'moySkladId is null');
                }
                await this.moySkladGateway.updateCustomerOrderState(order.moySkladId);
                break;
            }
            default:
                // Unknown event type — skip silently
                break;
        }
    }
}
