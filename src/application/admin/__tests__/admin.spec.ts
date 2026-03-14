import { describe, it, expect, vi } from 'vitest';
import { AdminListOrdersUseCase } from '../AdminListOrdersUseCase';
import { AdminPaymentIssuesUseCase } from '../AdminPaymentIssuesUseCase';
import { AdminRetryPaymentUseCase } from '../AdminRetryPaymentUseCase';
import { AdminMarkPaymentFailedUseCase } from '../AdminMarkPaymentFailedUseCase';
import { AdminRunJobUseCase } from '../AdminRunJobUseCase';
import { AdminGetJobStatusUseCase } from '../AdminGetJobStatusUseCase';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { PaymentGateway } from '@/application/ports/PaymentGateway';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { JobRunLogRepository } from '@/application/ports/JobRunLogRepository';
import { TransactionRunner, TransactionContext } from '@/application/ports/TransactionRunner';
import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        userId: 'user-1',
        items: [],
        totalAmount: 500,
        state: OrderState.PAYMENT,
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

function makePayment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: 'payment-1',
        orderId: 'order-1',
        amount: 500,
        status: PaymentStatus.PENDING,
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
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

function makePaymentRepo(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn(),
        ...overrides,
    };
}

function makeAuditRepo(): AuditLogRepository {
    return { save: vi.fn() };
}

function makePaymentGateway(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
    return {
        createPayment: vi.fn(),
        refundPayment: vi.fn(),
        ...overrides,
    };
}

function makeJobRunLogRepo(overrides: Partial<JobRunLogRepository> = {}): JobRunLogRepository {
    return {
        start: vi.fn().mockResolvedValue('run-1'),
        finish: vi.fn(),
        fail: vi.fn(),
        findLatest: vi.fn(),
        ...overrides,
    };
}

function makeTransactionRunner(paymentRepo: PaymentRepository, auditRepo: AuditLogRepository): TransactionRunner {
    return {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: makeOrderRepo(),
                paymentRepository: paymentRepo,
                productRepository: {} as any,
                outboxRepository: { save: vi.fn(), claimPending: vi.fn(), markProcessed: vi.fn(), markFailed: vi.fn(), incrementRetry: vi.fn() },
                auditLogRepository: auditRepo,
            })
        ),
    };
}

const ACTOR = { actorUserId: 'admin-1', actorRole: 'ADMIN', correlationId: 'corr-1' };

// ---------------------------------------------------------------------------
// AdminListOrdersUseCase
// ---------------------------------------------------------------------------

describe('AdminListOrdersUseCase', () => {
    it('returns orders and total from repository', async () => {
        const orders = [makeOrder()] as any[];
        const repo = makeOrderRepo({
            findAllWithFilters: vi.fn().mockResolvedValue(orders),
            countWithFilters: vi.fn().mockResolvedValue(1),
        });
        const useCase = new AdminListOrdersUseCase(repo);

        const result = await useCase.execute({});

        expect(result.orders).toBe(orders);
        expect(result.total).toBe(1);
    });

    it('uses default limit=50 and offset=0 when not specified', async () => {
        const repo = makeOrderRepo({
            findAllWithFilters: vi.fn().mockResolvedValue([]),
            countWithFilters: vi.fn().mockResolvedValue(0),
        });
        const useCase = new AdminListOrdersUseCase(repo);

        await useCase.execute({});

        expect(repo.findAllWithFilters).toHaveBeenCalledWith(
            expect.objectContaining({ limit: 50, offset: 0 })
        );
    });

    it('passes status and date filters to repository', async () => {
        const repo = makeOrderRepo({
            findAllWithFilters: vi.fn().mockResolvedValue([]),
            countWithFilters: vi.fn().mockResolvedValue(0),
        });
        const useCase = new AdminListOrdersUseCase(repo);

        await useCase.execute({ status: 'CREATED', dateFrom: '2026-01-01', dateTo: '2026-03-01', limit: 10, offset: 5 });

        expect(repo.findAllWithFilters).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'CREATED',
                dateFrom: new Date('2026-01-01'),
                dateTo: new Date('2026-03-01'),
                limit: 10,
                offset: 5,
            })
        );
    });
});

// ---------------------------------------------------------------------------
// AdminPaymentIssuesUseCase
// ---------------------------------------------------------------------------

describe('AdminPaymentIssuesUseCase', () => {
    it('returns issue rows with order state', async () => {
        const payment = makePayment();
        const order = makeOrder();
        const paymentRepo = makePaymentRepo({ findStalePending: vi.fn().mockResolvedValue([payment]) });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const useCase = new AdminPaymentIssuesUseCase(paymentRepo, orderRepo);

        const result = await useCase.execute();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            paymentId: 'payment-1',
            orderId: 'order-1',
            orderState: OrderState.PAYMENT,
            paymentStatus: PaymentStatus.PENDING,
            amount: 500,
        });
    });

    it('uses UNKNOWN as order state when order is not found', async () => {
        const payment = makePayment();
        const paymentRepo = makePaymentRepo({ findStalePending: vi.fn().mockResolvedValue([payment]) });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new AdminPaymentIssuesUseCase(paymentRepo, orderRepo);

        const result = await useCase.execute();

        expect(result[0].orderState).toBe('UNKNOWN');
    });

    it('returns empty array when no stale payments', async () => {
        const paymentRepo = makePaymentRepo({ findStalePending: vi.fn().mockResolvedValue([]) });
        const useCase = new AdminPaymentIssuesUseCase(paymentRepo, makeOrderRepo());

        const result = await useCase.execute();

        expect(result).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// AdminRetryPaymentUseCase
// ---------------------------------------------------------------------------

describe('AdminRetryPaymentUseCase', () => {
    it('creates gateway payment and returns confirmationUrl', async () => {
        const payment = makePayment();
        const order = makeOrder();
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const gateway = makePaymentGateway({
            createPayment: vi.fn().mockResolvedValue({ externalId: 'ext-1', confirmationUrl: 'https://pay.url' }),
        });
        const audit = makeAuditRepo();
        const useCase = new AdminRetryPaymentUseCase(paymentRepo, orderRepo, gateway, audit);

        const result = await useCase.execute({ paymentId: 'payment-1', returnUrl: 'https://shop.url', ...ACTOR });

        expect(result.confirmationUrl).toBe('https://pay.url');
        expect(gateway.createPayment).toHaveBeenCalledWith(
            expect.objectContaining({ internalPaymentId: 'payment-1', amount: 500 })
        );
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_RETRY' }));
    });

    it('throws when payment is not found', async () => {
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new AdminRetryPaymentUseCase(paymentRepo, makeOrderRepo(), makePaymentGateway(), makeAuditRepo());

        await expect(useCase.execute({ paymentId: 'missing', returnUrl: 'u', ...ACTOR }))
            .rejects.toThrow('Payment not found');
    });

    it('throws when payment is not PENDING', async () => {
        const payment = makePayment({ status: PaymentStatus.SUCCESS });
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const useCase = new AdminRetryPaymentUseCase(paymentRepo, makeOrderRepo(), makePaymentGateway(), makeAuditRepo());

        await expect(useCase.execute({ paymentId: 'payment-1', returnUrl: 'u', ...ACTOR }))
            .rejects.toThrow('Cannot retry');
    });

    it('throws when order is not found', async () => {
        const payment = makePayment();
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new AdminRetryPaymentUseCase(paymentRepo, orderRepo, makePaymentGateway(), makeAuditRepo());

        await expect(useCase.execute({ paymentId: 'payment-1', returnUrl: 'u', ...ACTOR }))
            .rejects.toThrow('Order not found');
    });

    it('logs PAYMENT_RETRY_FAILED and rethrows when gateway fails', async () => {
        const payment = makePayment();
        const order = makeOrder();
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const orderRepo = makeOrderRepo({ findById: vi.fn().mockResolvedValue(order) });
        const gateway = makePaymentGateway({
            createPayment: vi.fn().mockRejectedValue(new Error('Gateway unavailable')),
        });
        const audit = makeAuditRepo();
        const useCase = new AdminRetryPaymentUseCase(paymentRepo, orderRepo, gateway, audit);

        await expect(useCase.execute({ paymentId: 'payment-1', returnUrl: 'u', ...ACTOR }))
            .rejects.toThrow('Gateway unavailable');
        expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_RETRY_FAILED' }));
    });
});

// ---------------------------------------------------------------------------
// AdminMarkPaymentFailedUseCase
// ---------------------------------------------------------------------------

describe('AdminMarkPaymentFailedUseCase', () => {
    it('marks PENDING payment as FAILED and logs audit', async () => {
        const payment = makePayment();
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const audit = makeAuditRepo();
        const useCase = new AdminMarkPaymentFailedUseCase(makeTransactionRunner(paymentRepo, audit));

        await useCase.execute({ paymentId: 'payment-1', reason: 'Expired', ...ACTOR });

        expect(paymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: PaymentStatus.FAILED })
        );
        expect(audit.save).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'PAYMENT_MARK_FAILED', reason: 'Expired' })
        );
    });

    it('throws when payment is not found', async () => {
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(null) });
        const useCase = new AdminMarkPaymentFailedUseCase(makeTransactionRunner(paymentRepo, makeAuditRepo()));

        await expect(useCase.execute({ paymentId: 'missing', reason: 'test', ...ACTOR }))
            .rejects.toThrow('Payment not found');
    });

    it('is a no-op (idempotent) when payment is already SUCCESS', async () => {
        const payment = makePayment({ status: PaymentStatus.SUCCESS });
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const audit = makeAuditRepo();
        const useCase = new AdminMarkPaymentFailedUseCase(makeTransactionRunner(paymentRepo, audit));

        await useCase.execute({ paymentId: 'payment-1', reason: 'test', ...ACTOR });

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(audit.save).not.toHaveBeenCalled();
    });

    it('throws when payment status is FAILED (not PENDING)', async () => {
        const payment = makePayment({ status: PaymentStatus.FAILED });
        const paymentRepo = makePaymentRepo({ findById: vi.fn().mockResolvedValue(payment) });
        const useCase = new AdminMarkPaymentFailedUseCase(makeTransactionRunner(paymentRepo, makeAuditRepo()));

        await expect(useCase.execute({ paymentId: 'payment-1', reason: 'test', ...ACTOR }))
            .rejects.toThrow('Cannot mark payment as failed');
    });
});

// ---------------------------------------------------------------------------
// AdminRunJobUseCase
// ---------------------------------------------------------------------------

describe('AdminRunJobUseCase', () => {
    const RUN_INPUT = {
        actorUserId: 'admin-1',
        internalJobSecret: 'secret',
        baseUrl: 'http://localhost:3000',
    };

    it('runs a known job successfully and returns SUCCESS status', async () => {
        const jobRepo = makeJobRunLogRepo({ start: vi.fn().mockResolvedValue('run-42') });
        const useCase = new AdminRunJobUseCase(jobRepo);

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ result: { processed: 3, failed: 0 } }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const result = await useCase.execute({ jobName: 'process-outbox', ...RUN_INPUT });

        expect(result.status).toBe('SUCCESS');
        expect(result.runId).toBe('run-42');
        expect(result.jobName).toBe('process-outbox');
        expect(jobRepo.start).toHaveBeenCalledWith('process-outbox', 'admin-1');
        expect(jobRepo.finish).toHaveBeenCalledWith('run-42', { processed: 3, failed: 0 });

        vi.unstubAllGlobals();
    });

    it('throws for an unknown job name', async () => {
        const useCase = new AdminRunJobUseCase(makeJobRunLogRepo());

        await expect(useCase.execute({ jobName: 'nonexistent-job', ...RUN_INPUT }))
            .rejects.toThrow('Unknown job');
    });

    it('calls fail and rethrows when job endpoint responds with non-ok status', async () => {
        const jobRepo = makeJobRunLogRepo({ start: vi.fn().mockResolvedValue('run-1') });
        const useCase = new AdminRunJobUseCase(jobRepo);

        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue('Internal error'),
        });
        vi.stubGlobal('fetch', mockFetch);

        await expect(useCase.execute({ jobName: 'payment-timeout', ...RUN_INPUT }))
            .rejects.toThrow('500');
        expect(jobRepo.fail).toHaveBeenCalledWith('run-1', expect.stringContaining('500'));

        vi.unstubAllGlobals();
    });

    it.each([
        ['payment-timeout', '/api/internal/jobs/payment-timeout'],
        ['process-outbox', '/api/internal/jobs/process-outbox'],
        ['sync-products', '/api/internal/jobs/sync-products'],
    ])('resolves correct URL for job "%s"', async (jobName, expectedPath) => {
        const useCase = new AdminRunJobUseCase(makeJobRunLogRepo());
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({}),
        });
        vi.stubGlobal('fetch', mockFetch);

        await useCase.execute({ jobName, ...RUN_INPUT });

        expect(mockFetch).toHaveBeenCalledWith(
            `http://localhost:3000${expectedPath}`,
            expect.any(Object)
        );

        vi.unstubAllGlobals();
    });
});

// ---------------------------------------------------------------------------
// AdminGetJobStatusUseCase
// ---------------------------------------------------------------------------

describe('AdminGetJobStatusUseCase', () => {
    it('returns the latest job run log', async () => {
        const log = { id: 'run-1', jobName: 'process-outbox', status: 'SUCCESS' as const, startedAt: new Date() };
        const repo = makeJobRunLogRepo({ findLatest: vi.fn().mockResolvedValue(log) });
        const useCase = new AdminGetJobStatusUseCase(repo);

        const result = await useCase.execute({ jobName: 'process-outbox' });

        expect(result).toBe(log);
        expect(repo.findLatest).toHaveBeenCalledWith('process-outbox');
    });

    it('returns null when no runs exist for the job', async () => {
        const repo = makeJobRunLogRepo({ findLatest: vi.fn().mockResolvedValue(null) });
        const useCase = new AdminGetJobStatusUseCase(repo);

        const result = await useCase.execute({ jobName: 'sync-products' });

        expect(result).toBeNull();
    });
});
