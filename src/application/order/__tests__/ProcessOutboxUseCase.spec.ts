import { describe, it, expect, vi } from 'vitest';
import { ProcessOutboxUseCase } from '../ProcessOutboxUseCase';
import { OutboxRepository, OutboxEvent } from '@/application/ports/OutboxRepository';
import { MoySkladGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';

const MAX_RETRIES = 3;

function makeEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
    return {
        id: 'evt-1',
        eventType: 'ORDER_DELIVERED',
        payload: { orderId: 'order-1', items: [{ productId: 'p1', article: 'A1', name: 'Product', price: 100, quantity: 2 }] },
        createdAt: new Date(),
        processedAt: null,
        failedAt: null,
        errorMessage: null,
        retryCount: 0,
        ...overrides,
    };
}

function makeRepo(events: OutboxEvent[]): OutboxRepository {
    return {
        save: vi.fn(),
        findPending: vi.fn().mockResolvedValue(events),
        markProcessed: vi.fn().mockResolvedValue(undefined),
        markFailed: vi.fn().mockResolvedValue(undefined),
        incrementRetry: vi.fn().mockResolvedValue(undefined),
    };
}

function makeGateway(impl?: () => Promise<void>): MoySkladGateway {
    return {
        exportOrder: vi.fn().mockImplementation(impl ?? (() => Promise.resolve())),
    };
}

describe('ProcessOutboxUseCase', () => {

    it('1. успешная обработка: exportOrder вызван, markProcessed вызван', async () => {
        const event = makeEvent();
        const repo = makeRepo([event]);
        const gateway = makeGateway();

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(gateway.exportOrder).toHaveBeenCalledOnce();
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });

    it('2. пустой outbox: exportOrder не вызван', async () => {
        const repo = makeRepo([]);
        const gateway = makeGateway();

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(gateway.exportOrder).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 0 });
    });

    it('3. MoySkladProductNotFoundError: markFailed вызван, incrementRetry не вызван', async () => {
        const event = makeEvent();
        const repo = makeRepo([event]);
        const gateway = makeGateway(() => { throw new MoySkladProductNotFoundError(['A1']); });

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(repo.markFailed).toHaveBeenCalledWith(event.id, expect.stringContaining('A1'));
        expect(repo.incrementRetry).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 1 });
    });

    it('4. временная ошибка (retryCount=0): incrementRetry вызван, markFailed не вызван', async () => {
        const event = makeEvent({ retryCount: 0 });
        const repo = makeRepo([event]);
        const gateway = makeGateway(() => { throw new Error('network error'); });

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(repo.incrementRetry).toHaveBeenCalledWith(event.id);
        expect(repo.markFailed).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 1, failed: 0 });
    });

    it('5. временная ошибка (retryCount = MAX_RETRIES-1): markFailed вызван, incrementRetry не вызван', async () => {
        const event = makeEvent({ retryCount: MAX_RETRIES - 1 });
        const repo = makeRepo([event]);
        const gateway = makeGateway(() => { throw new Error('network error'); });

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(repo.markFailed).toHaveBeenCalledWith(event.id, 'network error');
        expect(repo.incrementRetry).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 1 });
    });

    it('6. несколько событий — частичный сбой: обработка продолжается, сумма = кол-во событий', async () => {
        const events = [
            makeEvent({ id: 'evt-1' }),
            makeEvent({ id: 'evt-2' }),
            makeEvent({ id: 'evt-3', retryCount: MAX_RETRIES - 1 }),
        ];
        const repo = makeRepo(events);
        // evt-1 успех, evt-2 бизнес-ошибка, evt-3 временная ошибка → markFailed
        const gateway: MoySkladGateway = {
            exportOrder: vi.fn()
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new MoySkladProductNotFoundError(['X1']))
                .mockRejectedValueOnce(new Error('timeout')),
        };

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(result.processed + result.retried + result.failed).toBe(events.length);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 2 });
    });

    it('7. неизвестный eventType: markProcessed вызван без обращения к gateway', async () => {
        const event = makeEvent({ eventType: 'UNKNOWN_EVENT' });
        const repo = makeRepo([event]);
        const gateway = makeGateway();

        const result = await new ProcessOutboxUseCase(repo, gateway).execute();

        expect(gateway.exportOrder).not.toHaveBeenCalled();
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });
});
