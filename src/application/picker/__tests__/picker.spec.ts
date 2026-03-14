import { describe, it, expect, vi } from 'vitest';
import { PickerListAvailableUseCase } from '../PickerListAvailableUseCase';
import { PickerListMyOrdersUseCase } from '../PickerListMyOrdersUseCase';
import { PickerClaimOrderUseCase } from '../PickerClaimOrderUseCase';
import { PickerReleaseOrderUseCase } from '../PickerReleaseOrderUseCase';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 100,
        state: OrderState.CREATED,
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

const BASE_INPUT = {
    orderId: 'order-1',
    userId: 'picker-1',
    userRole: 'PICKER',
    correlationId: 'corr-1',
};

// ---------------------------------------------------------------------------
// PickerListAvailableUseCase
// ---------------------------------------------------------------------------

describe('PickerListAvailableUseCase', () => {
    it('returns available orders from repository', async () => {
        const orders = [makeOrder(), makeOrder({ id: 'order-2' })];
        const repo = makeOrderRepo({ findAvailableForPicking: vi.fn().mockResolvedValue(orders) });
        const useCase = new PickerListAvailableUseCase(repo);

        const result = await useCase.execute();

        expect(result).toBe(orders);
        expect(repo.findAvailableForPicking).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// PickerListMyOrdersUseCase
// ---------------------------------------------------------------------------

describe('PickerListMyOrdersUseCase', () => {
    it('returns orders claimed by the given user', async () => {
        const orders = [makeOrder({ pickerClaimUserId: 'picker-1' })];
        const repo = makeOrderRepo({ findByPickerClaimUserId: vi.fn().mockResolvedValue(orders) });
        const useCase = new PickerListMyOrdersUseCase(repo);

        const result = await useCase.execute({ userId: 'picker-1' });

        expect(result).toBe(orders);
        expect(repo.findByPickerClaimUserId).toHaveBeenCalledWith('picker-1');
    });
});

// ---------------------------------------------------------------------------
// PickerClaimOrderUseCase
// ---------------------------------------------------------------------------

describe('PickerClaimOrderUseCase', () => {
    it('claims the order and logs audit when successful', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder()),
            claimForPicker: vi.fn().mockResolvedValue(true),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerClaimOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.claimForPicker).toHaveBeenCalledWith('order-1', 'picker-1');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PICKER_CLAIM' }));
    });

    it('is idempotent when order is already claimed by the same user', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'picker-1' })),
            claimForPicker: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerClaimOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.claimForPicker).not.toHaveBeenCalled();
        expect(audit.save).not.toHaveBeenCalled();
    });

    it('throws when order is not found', async () => {
        const repo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new PickerClaimOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('logs PICKER_CLAIM_CONFLICT and throws when claim is taken by another picker', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'other-picker' })),
            claimForPicker: vi.fn().mockResolvedValue(false),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerClaimOrderUseCase(repo, audit);

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('already claimed');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PICKER_CLAIM_CONFLICT' }));
    });
});

// ---------------------------------------------------------------------------
// PickerReleaseOrderUseCase
// ---------------------------------------------------------------------------

describe('PickerReleaseOrderUseCase', () => {
    it('releases own claim and logs audit', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'picker-1' })),
            releasePickerClaim: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerReleaseOrderUseCase(repo, audit);

        await useCase.execute(BASE_INPUT);

        expect(repo.releasePickerClaim).toHaveBeenCalledWith('order-1', 'picker-1');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PICKER_RELEASE' }));
    });

    it('is idempotent when order is already unclaimed', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: null })),
            releasePickerClaim: vi.fn(),
        });
        const useCase = new PickerReleaseOrderUseCase(repo, makeAuditRepo());

        await useCase.execute(BASE_INPUT);

        expect(repo.releasePickerClaim).not.toHaveBeenCalled();
    });

    it('throws when order is not found', async () => {
        const repo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new PickerReleaseOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Order not found');
    });

    it('throws and logs FORBIDDEN when non-owner non-admin tries to release', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'other-picker' })),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerReleaseOrderUseCase(repo, audit);

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow('Cannot release');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PICKER_RELEASE_FORBIDDEN' }));
    });

    it('throws when admin tries to override without providing a reason', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'other-picker' })),
        });
        const useCase = new PickerReleaseOrderUseCase(repo, makeAuditRepo());

        await expect(useCase.execute({ ...BASE_INPUT, userRole: 'ADMIN' }))
            .rejects.toThrow('requires a reason');
    });

    it('admin can override release with a reason and logs PICKER_RELEASE_OVERRIDE', async () => {
        const repo = makeOrderRepo({
            findById: vi.fn().mockResolvedValue(makeOrder({ pickerClaimUserId: 'other-picker' })),
            releasePickerClaim: vi.fn(),
        });
        const audit = makeAuditRepo();
        const useCase = new PickerReleaseOrderUseCase(repo, audit);

        await useCase.execute({ ...BASE_INPUT, userRole: 'ADMIN', reason: 'Picker no-show' });

        expect(repo.releasePickerClaim).toHaveBeenCalledWith('order-1', undefined);
        expect(audit.save).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'PICKER_RELEASE_OVERRIDE', reason: 'Picker no-show' })
        );
    });
});
