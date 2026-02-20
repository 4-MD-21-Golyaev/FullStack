import { describe, it, expect, vi } from 'vitest';
import { PayOrderUseCase } from '../PayOrderUseCase';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Product } from '@/domain/product/Product';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

const makeProduct = (stock: number): Product => ({
    id: 'p1', name: 'Product', article: 'A1', price: 500, stock,
    imagePath: null, categoryId: 'c1',
});

function makeTransactionRunner(order: Order | null, product: Product | null): TransactionRunner & { _repos: any } {
    const orderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const paymentRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn().mockResolvedValue([]),
    };
    const productRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };

    const runner: any = {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({ orderRepository: orderRepo, paymentRepository: paymentRepo, productRepository: productRepo })
        ),
        _repos: { orderRepo, paymentRepo, productRepo },
    };

    return runner;
}

describe('PayOrderUseCase', () => {

    it('creates payment with SUCCESS status and transitions order to DELIVERY', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.PAYMENT), makeProduct(10));
        const result = await new PayOrderUseCase(runner).execute({ orderId: 'order-1' });

        expect(result.order.state).toBe(OrderState.DELIVERY);
        expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
        expect(result.payment.orderId).toBe('order-1');
        expect(result.payment.amount).toBe(500);
    });

    it('deducts stock after successful payment', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.PAYMENT), makeProduct(10));
        await new PayOrderUseCase(runner).execute({ orderId: 'order-1' });

        expect(runner._repos.productRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'p1', stock: 8 }) // 10 - 2
        );
    });

    it('cancels order and throws when stock is insufficient', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.PAYMENT), makeProduct(1));

        await expect(new PayOrderUseCase(runner).execute({ orderId: 'order-1' }))
            .rejects.toThrow('Insufficient stock');

        expect(runner._repos.orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
        expect(runner._repos.paymentRepo.save).not.toHaveBeenCalled();
        expect(runner._repos.productRepo.save).not.toHaveBeenCalled();
    });

    it('cancels order and throws when product is not found', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.PAYMENT), null);

        await expect(new PayOrderUseCase(runner).execute({ orderId: 'order-1' }))
            .rejects.toThrow('not found');

        expect(runner._repos.orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('throws idempotency error when order is already in DELIVERY', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.DELIVERY), makeProduct(10));

        await expect(new PayOrderUseCase(runner).execute({ orderId: 'order-1' }))
            .rejects.toThrow('Payment already processed');

        expect(runner._repos.paymentRepo.save).not.toHaveBeenCalled();
        expect(runner._repos.productRepo.save).not.toHaveBeenCalled();
    });

    it('throws idempotency error when order is already CLOSED', async () => {
        const runner = makeTransactionRunner(makeOrder(OrderState.CLOSED), makeProduct(10));

        await expect(new PayOrderUseCase(runner).execute({ orderId: 'order-1' }))
            .rejects.toThrow('Payment already processed');
    });

    it('throws if order not found', async () => {
        const runner = makeTransactionRunner(null, null);

        await expect(new PayOrderUseCase(runner).execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });
});
