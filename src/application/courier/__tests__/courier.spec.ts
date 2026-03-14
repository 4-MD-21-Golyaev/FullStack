import { describe, it, expect, vi } from 'vitest';
import { CourierListAvailableUseCase } from '../CourierListAvailableUseCase';
import { CourierListMyOrdersUseCase } from '../CourierListMyOrdersUseCase';
import { CourierClaimOrderUseCase } from '../CourierClaimOrderUseCase';
import { CourierReleaseOrderUseCase } from '../CourierReleaseOrderUseCase';
import { CourierStartDeliveryUseCase } from '../CourierStartDeliveryUseCase';
import { CourierConfirmDeliveredUseCase } from '../CourierConfirmDeliveredUseCase';
import { CourierMarkDeliveryFailedUseCase } from '../CourierMarkDeliveryFailedUseCase';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { TransactionRunner, TransactionContext } from '@/application/ports/TransactionRunner';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        state: OrderState.DELIVERY_ASSIGNED,
        address: 'Address 1',
        absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
        pickerClaimUserId: null,
        pickerClaimedAt: null,
        deliveryClaimUserId: null,
        deliveryClaimedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function makeOrderRepo(overrides: Partial<OrderRepository> = {}): OrderRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn(),
        findStaleInPayment: vi.fn(),
        findAllWithFilters: vi.fn(),
        countWithFilters: vi.fn(),
        findAvailableForPicking: vi.fn(),
        findByPickerClaimUserId: vi.fn(),
        claimForPicker: vi.fn(),
        releasePickerClaim: vi.fn(),
        findAvailableForDelivery: vi.fn(),
        findByCourierClaimUserId: vi.fn(),
        claimForCourier: vi.fn(),
        releaseCourierClaim: vi.fn(),
        ...overrides,
    };
}

function makeAuditRepo(): AuditLogRepository {
    return { save: vi.fn() };
}

function makeTransactionRunner(orderRepo: OrderRepository, auditRepo: AuditLogRepository): TransactionRunner {
    return {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: orderRepo,
                paymentRepository: {} as any,
                productRepository: {} as any,
                outboxRepository: { save: vi.fn(), claimPending: vi.fn(), markProcessed: vi.fn(), markFailed: vi.fn(), incrementRetry: vi.fn() },
                auditLogRepository: auditRepo,
            })
        ),
    };
}

const BASE_INPUT = {
    orderId: 'order-1',
    userId: 'courier-1',
    userRole: 'COURIER',
    correlationId: 'corr-1',
};

// ---------------------------------------------------------------------------
// CourierListAvailableUseCase
// ---------------------------------------------------------------------------

describe('CourierListAvailableUseCase', () => {
    it('returns available orders from repository', async () => {
        const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
        const repo = makeOrderRepo({ findAvailableForDelivery: vi.fn().mockResolvedValue(orders) });
        const useCase = new CourierListAvailableUseCase(repo);

        const result = await useCase.execute();

        expect(result).toBe(orders);
        expect(repo.findAvailableForDelivery).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// CourierListMyOrdersUseCase
// ---------------------------------------------------------------------------

describe('CourierListMyOrdersUseCase', () => {
    it('returns orders assigned to the given courier', async () => {
        const orders = [makeOrder({ deliveryClaimUserId: 'courier-1' })];
        const repo = makeOrderRepo({ findByCourierClaimUserId: vi.fn().mockResolvedValue(orders) });
        const useCase = new CourierListMyOrdersUseCase(repo);

        const result = await useCase.execute({ userId: 'courier-1' });

        expect(result).toBe(orders);
        expect(repo.findByCourierClaimUserId).toHaveBeenCalledWith('courier-1');
    });
});

// ---------------------------------------------------------------------------
// CourierClaimOrderUseCase
// ---------------------------------------------------------------------------

describe('CourierClaimOrderUseCase', () => {
    it('claims the order and logs audit when successful', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder()),
            claimForCourier: vi.fn().mockResolvedValue(true),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierClaimOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.claimForCourier).toHaveBeenCalledWith('order-1', 'courier-1');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_CLAIM' }));
    });

    it('is idempotent when order is already claimed by the same courier', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'courier-1' })),
            claimForCourier: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierClaimOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.claimForCourier).not.toHaveBeenCalled();
        expect(audit.save).not.toHaveBeenCalled();
    });

    it('throws when order is not found', async () => {
        const repo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new CourierClaimOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('logs COURIER_CLAIM_CONFLICT and throws when claim is taken by another courier', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'other-courier' })),
            claimForCourier: vi.fn().mockResolvedValue(false),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierClaimOrderUseCase(repo, audit);

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('already claimed');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_CLAIM_CONFLICT' }));
    });
});

// ---------------------------------------------------------------------------
// CourierReleaseOrderUseCase
// ---------------------------------------------------------------------------

describe('CourierReleaseOrderUseCase', () => {
    it('releases own claim and logs audit', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'courier-1' })),
            releaseCourierClaim: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierReleaseOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.releaseCourierClaim).toHaveBeenCalledWith('order-1', 'courier-1');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_RELEASE' }));
    });

    it('is idempotent when order has no active claim', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: null })),
            releaseCourierClaim: vi.fn(),
        });
        const useCase = new CourierReleaseOrderUseCase(repo, makeAuditRepo());

        await useCase.execute(BASE_INPUT);

        expect(repo.releaseCourierClaim).not.toHaveBeenCalled();
    });

    it('throws when order is not found', async () => {
        const repo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new CourierReleaseOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('throws and logs FORBIDDEN when non-owner non-admin tries to release', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'other-courier' })),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierReleaseOrderUseCase(repo, audit);

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Cannot release');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_RELEASE_FORBIDDEN' }));
    });

    it('throws when admin tries to override without a reason', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'other-courier' })),
        });
        const useCase = new CourierReleaseOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute({ ...BASE_INPUT, userRole: 'ADMIN' }))
            .rejects.toThrow('requires a reason');
    });

    it('admin can override release with a reason and logs COURIER_RELEASE_OVERRIDE', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ deliveryClaimUserId: 'other-courier' })),
            releaseCourierClaim: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new CourierReleaseOrderUseCase(repo, audit);

        await useCase.execute({ ...BASE_INPUT, userRole: 'ADMIN', reason: 'Courier unreachable' });

        expect(repo.releaseCourierClaim).toHaveBeenCalledWith('order-1', undefined);
        expect(audit.save).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'COURIER_RELEASE_OVERRIDE', reason: 'Courier unreachable' })
        );
    });
});

// ---------------------------------------------------------------------------
// CourierStartDeliveryUseCase
// ---------------------------------------------------------------------------

describe('CourierStartDeliveryUseCase', () => {
    it('transitions DELIVERY_ASSIGNED → OUT_FOR_DELIVERY for the assigned courier', async () => {
        const order = makeOrder({ state: OrderState.DELIVERY_ASSIGNED, deliveryClaimUserId: 'courier-1' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const audit = makeAuditRepo();
        const useCase = new CourierStartDeliveryUseCase(makeTransactionRunner(orderRepo, audit));

        const result = await useCase.execute(BASE_INPUT);

        expect(result.state).toBe(OrderState.OUT_FOR_DELIVERY);
        expect(result.outForDeliveryAt).toBeInstanceOf(Date);
        expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ state: OrderState.OUT_FOR_DELIVERY }));
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_START_DELIVERY' }));
    });

    it('throws when order is not found', async () => {
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new CourierStartDeliveryUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('throws when the courier is not the assigned one', async () => {
        const order = makeOrder({ state: OrderState.DELIVERY_ASSIGNED, deliveryClaimUserId: 'other-courier' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const useCase = new CourierStartDeliveryUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Only the assigned courier');
    });
});

// ---------------------------------------------------------------------------
// CourierConfirmDeliveredUseCase
// ---------------------------------------------------------------------------

describe('CourierConfirmDeliveredUseCase', () => {
    it('transitions OUT_FOR_DELIVERY → DELIVERED → CLOSED and emits ORDER_COMPLETED outbox event', async () => {
        const order = makeOrder({ state: OrderState.OUT_FOR_DELIVERY, deliveryClaimUserId: 'courier-1' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const audit = makeAuditRepo();
        const outboxSave = vi.fn();
        const txRunner: TransactionRunner = {
            run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
                work({
                    orderRepository: orderRepo,
                    paymentRepository: {} as any,
                    productRepository: {} as any,
                    outboxRepository: { save: outboxSave, claimPending: vi.fn(), markProcessed: vi.fn(), markFailed: vi.fn(), incrementRetry: vi.fn() },
                    auditLogRepository: audit,
                })
            ),
        };
        const useCase = new CourierConfirmDeliveredUseCase(txRunner);

        const result = await useCase.execute(BASE_INPUT);

        expect(result.state).toBe(OrderState.CLOSED);
        expect(result.deliveredAt).toBeInstanceOf(Date);
        expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ state: OrderState.CLOSED }));
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'COURIER_CONFIRM_DELIVERED' }));
        expect(outboxSave).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'ORDER_COMPLETED' }));
    });

    it('throws when order is not found', async () => {
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new CourierConfirmDeliveredUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('throws when the courier is not the assigned one', async () => {
        const order = makeOrder({ state: OrderState.OUT_FOR_DELIVERY, deliveryClaimUserId: 'other-courier' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const useCase = new CourierConfirmDeliveredUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Only the assigned courier');
    });
});

// ---------------------------------------------------------------------------
// CourierMarkDeliveryFailedUseCase
// ---------------------------------------------------------------------------

describe('CourierMarkDeliveryFailedUseCase', () => {
    it('transitions OUT_FOR_DELIVERY → DELIVERY_ASSIGNED and logs audit', async () => {
        const order = makeOrder({ state: OrderState.OUT_FOR_DELIVERY, deliveryClaimUserId: 'courier-1' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const audit = makeAuditRepo();
        const useCase = new CourierMarkDeliveryFailedUseCase(makeTransactionRunner(orderRepo, audit));

        const result = await useCase.execute({ ...BASE_INPUT, reason: 'Customer not home' });

        expect(result.state).toBe(OrderState.DELIVERY_ASSIGNED);
        expect(result.deliveryClaimUserId).toBeNull();
        expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ state: OrderState.DELIVERY_ASSIGNED }));
        expect(audit.save).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'COURIER_DELIVERY_FAILED', reason: 'Customer not home' })
        );
    });

    it('throws when order is not found', async () => {
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new CourierMarkDeliveryFailedUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute({ ...BASE_INPUT, reason: 'test' })).rejects.toThrow('Order not found');
    });

    it('throws when the courier is not the assigned one', async () => {
        const order = makeOrder({ state: OrderState.OUT_FOR_DELIVERY, deliveryClaimUserId: 'other-courier' });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const useCase = new CourierMarkDeliveryFailedUseCase(makeTransactionRunner(orderRepo, makeAuditRepo()));

        await expect(useCase.execute({ ...BASE_INPUT, reason: 'test' })).rejects.toThrow('Only the assigned courier');
    });
});
