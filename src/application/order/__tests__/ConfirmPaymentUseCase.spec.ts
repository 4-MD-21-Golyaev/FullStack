import { describe, it, expect, vi } from 'vitest';
import { ConfirmPaymentUseCase } from '../ConfirmPaymentUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { Product } from '@/domain/product/Product';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

const makePayment = (status: PaymentStatus): Payment => ({
    id: 'pay-1',
    orderId: 'order-1',
    amount: 500,
    status,
    externalId: 'yk-ext-id',
    createdAt: new Date(),
});

const makeProduct = (stock: number): Product => ({
    id: 'p1', name: 'Product', article: 'A1', price: 500, stock,
    imagePath: null, categoryId: 'c1',
});

function makeRepos(payment: Payment | null, order: Order | null, product: Product | null) {
    const orderRepo: OrderRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findByExternalId: vi.fn().mockResolvedValue(payment),
    };
    const productRepo: ProductRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };
    return { orderRepo, paymentRepo, productRepo };
}

describe('ConfirmPaymentUseCase', () => {

    it('on payment.succeeded: transitions order to DELIVERY and deducts stock', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(
            makePayment(PaymentStatus.PENDING),
            makeOrder(OrderState.PAYMENT),
            makeProduct(10)
        );

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' });

        expect(result.alreadyProcessed).toBe(false);
        expect(result.order!.state).toBe(OrderState.DELIVERY);
        expect(result.payment!.status).toBe(PaymentStatus.SUCCESS);

        expect(productRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ stock: 8 }) // 10 - 2
        );
    });

    it('on payment.canceled: cancels order and marks payment FAILED', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(
            makePayment(PaymentStatus.PENDING),
            makeOrder(OrderState.PAYMENT),
            makeProduct(10)
        );

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.canceled' });

        expect(result.order!.state).toBe(OrderState.CANCELLED);
        expect(result.payment!.status).toBe(PaymentStatus.FAILED);
        expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('returns alreadyProcessed=true when payment is already SUCCESS', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(
            makePayment(PaymentStatus.SUCCESS),
            makeOrder(OrderState.DELIVERY),
            makeProduct(8)
        );

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' });

        expect(result.alreadyProcessed).toBe(true);
        expect(orderRepo.save).not.toHaveBeenCalled();
        expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('returns alreadyProcessed=true when payment is already FAILED', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(
            makePayment(PaymentStatus.FAILED),
            makeOrder(OrderState.CANCELLED),
            makeProduct(10)
        );

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.canceled' });

        expect(result.alreadyProcessed).toBe(true);
        expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('on succeeded with insufficient stock: cancels order and marks FAILED', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(
            makePayment(PaymentStatus.PENDING),
            makeOrder(OrderState.PAYMENT),
            makeProduct(1) // меньше чем quantity: 2
        );

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' }))
            .rejects.toThrow('Insufficient stock');

        expect(paymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: PaymentStatus.FAILED })
        );
        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('throws if payment not found by externalId', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(null, null, null);

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ externalId: 'unknown', event: 'payment.succeeded' }))
            .rejects.toThrow('not found');
    });
});
