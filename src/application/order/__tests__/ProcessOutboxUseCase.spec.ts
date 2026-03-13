import { describe, it, expect, vi } from 'vitest';
import { ProcessOutboxUseCase } from '../ProcessOutboxUseCase';
import { OutboxRepository, OutboxEvent } from '@/application/ports/OutboxRepository';
import { MoySkladGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const MAX_RETRIES = 3;

const baseOrder: Order = {
    id: 'order-1',
    userId: 'user-1',
    address: 'Test',
    totalAmount: 200,
    state: OrderState.DELIVERY_ASSIGNED,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 100, quantity: 2 }],
    moySkladId: 'ms-123',
    createdAt: new Date(),
    updatedAt: new Date(),
};

function makeEvent(overrides: Partial<OutboxEvent> = {}): OutboxEvent {
    return {
        id: 'evt-1',
        eventType: 'ORDER_CREATED',
        payload: {
            orderId: 'order-1',
            items: [{ productId: 'p1', article: 'A1', name: 'Product', price: 100, quantity: 2 }],
            totalAmount: 200,
        },
        createdAt: new Date(),
        processedAt: null,
        failedAt: null,
        errorMessage: null,
        retryCount: 0,
        claimedAt: new Date(),
        ...overrides,
    };
}

function makeRepo(events: OutboxEvent[]): OutboxRepository {
    return {
        save: vi.fn(),
        claimPending: vi.fn().mockResolvedValue(events),
        markProcessed: vi.fn().mockResolvedValue(undefined),
        markFailed: vi.fn().mockResolvedValue(undefined),
        incrementRetry: vi.fn().mockResolvedValue(undefined),
    };
}

function makeGateway(): MoySkladGateway {
    return {
        createCustomerOrder: vi.fn().mockResolvedValue('ms-123'),
        updateCustomerOrder: vi.fn().mockResolvedValue(undefined),
        createPaymentIn: vi.fn().mockResolvedValue(undefined),
        updateCustomerOrderState: vi.fn().mockResolvedValue(undefined),
        fetchFolders: vi.fn().mockResolvedValue([]),
        fetchProducts: vi.fn().mockResolvedValue([]),
    };
}

function makeOrderRepo(order: Order | null = baseOrder): OrderRepository {
    return {
        findById: vi.fn().mockResolvedValue(order),
        save: vi.fn(),
        findByUserId: vi.fn(),
        findStaleInPayment: vi.fn(),
        findAllWithFilters: vi.fn() as any,
        countWithFilters: vi.fn() as any,
        findAvailableForPicking: vi.fn() as any,
        findByPickerClaimUserId: vi.fn() as any,
        claimForPicker: vi.fn() as any,
        releasePickerClaim: vi.fn() as any,
        findAvailableForDelivery: vi.fn() as any,
        findByCourierClaimUserId: vi.fn() as any,
        claimForCourier: vi.fn() as any,
        releaseCourierClaim: vi.fn() as any,
    };
}

describe('ProcessOutboxUseCase', () => {

    it('ORDER_CREATED: createCustomerOrder вызван, moySkladId записан в order', async () => {
        const event = makeEvent();
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.createCustomerOrder).toHaveBeenCalledWith('order-1', expect.any(Array), 200);
        expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ moySkladId: 'ms-123' }));
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });

    it('ORDER_PICKED: updateCustomerOrder вызван с items и totalAmount', async () => {
        const event = makeEvent({
            eventType: 'ORDER_PICKED',
            payload: {
                orderId: 'order-1',
                items: [{ productId: 'p1', article: 'A1', name: 'Product', price: 100, quantity: 2 }],
                totalAmount: 200,
            },
        });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo();

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.updateCustomerOrder).toHaveBeenCalledWith('ms-123', expect.any(Array), 200);
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });

    it('PAYMENT_RECEIVED: createPaymentIn вызван', async () => {
        const event = makeEvent({
            eventType: 'PAYMENT_RECEIVED',
            payload: { orderId: 'order-1', amount: 200 },
        });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo();

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.createPaymentIn).toHaveBeenCalledWith('ms-123', 200, 'order-1');
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });

    it('ORDER_COMPLETED: updateCustomerOrderState вызван', async () => {
        const event = makeEvent({
            eventType: 'ORDER_COMPLETED',
            payload: { orderId: 'order-1' },
        });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo();

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.updateCustomerOrderState).toHaveBeenCalledWith('ms-123');
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });

    it('ORDER_PICKED при moySkladId === null: incrementRetry, gateway не вызван', async () => {
        const event = makeEvent({
            eventType: 'ORDER_PICKED',
            payload: { orderId: 'order-1', items: [], totalAmount: 0 },
        });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.updateCustomerOrder).not.toHaveBeenCalled();
        expect(repo.incrementRetry).toHaveBeenCalledWith(event.id);
        expect(repo.markFailed).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 1, failed: 0 });
    });

    it('prerequisite retry не учитывает MAX_RETRIES', async () => {
        const event = makeEvent({
            eventType: 'ORDER_PICKED',
            payload: { orderId: 'order-1', items: [], totalAmount: 0 },
            retryCount: MAX_RETRIES + 10,  // well above max
        });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        // Should still retry, not fail
        expect(repo.incrementRetry).toHaveBeenCalledWith(event.id);
        expect(repo.markFailed).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 1, failed: 0 });
    });

    it('пустой outbox: gateway не вызван', async () => {
        const repo = makeRepo([]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo();

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.createCustomerOrder).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 0 });
    });

    it('MoySkladProductNotFoundError: markFailed вызван', async () => {
        const event = makeEvent();
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        (gateway.createCustomerOrder as any).mockRejectedValue(new MoySkladProductNotFoundError(['A1']));
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(repo.markFailed).toHaveBeenCalledWith(event.id, expect.stringContaining('A1'));
        expect(repo.incrementRetry).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 1 });
    });

    it('временная ошибка (retryCount=0): incrementRetry, не markFailed', async () => {
        const event = makeEvent({ retryCount: 0 });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        (gateway.createCustomerOrder as any).mockRejectedValue(new Error('network error'));
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(repo.incrementRetry).toHaveBeenCalledWith(event.id);
        expect(repo.markFailed).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 1, failed: 0 });
    });

    it('временная ошибка (retryCount = MAX_RETRIES-1): markFailed', async () => {
        const event = makeEvent({ retryCount: MAX_RETRIES - 1 });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        (gateway.createCustomerOrder as any).mockRejectedValue(new Error('network error'));
        const orderRepo = makeOrderRepo({ ...baseOrder, moySkladId: null });

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(repo.markFailed).toHaveBeenCalledWith(event.id, 'network error');
        expect(repo.incrementRetry).not.toHaveBeenCalled();
        expect(result).toEqual({ processed: 0, retried: 0, failed: 1 });
    });

    it('неизвестный eventType: markProcessed без обращения к gateway', async () => {
        const event = makeEvent({ eventType: 'UNKNOWN_EVENT' });
        const repo = makeRepo([event]);
        const gateway = makeGateway();
        const orderRepo = makeOrderRepo();

        const result = await new ProcessOutboxUseCase(repo, gateway, orderRepo).execute();

        expect(gateway.createCustomerOrder).not.toHaveBeenCalled();
        expect(gateway.updateCustomerOrder).not.toHaveBeenCalled();
        expect(gateway.createPaymentIn).not.toHaveBeenCalled();
        expect(gateway.updateCustomerOrderState).not.toHaveBeenCalled();
        expect(repo.markProcessed).toHaveBeenCalledWith(event.id);
        expect(result).toEqual({ processed: 1, retried: 0, failed: 0 });
    });
});
