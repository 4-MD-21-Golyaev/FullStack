import { describe, it, expect, vi } from 'vitest';
import { PayOrderUseCase } from '../PayOrderUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
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

const makeProduct = (stock: number): Product => ({
    id: 'p1',
    name: 'Product',
    article: 'A1',
    price: 500,
    stock,
    imagePath: null,
    categoryId: 'c1',
});

function makeRepos(order: Order | null, product: Product | null) {
    const orderRepo: OrderRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
    };
    const productRepo: ProductRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };
    return { orderRepo, paymentRepo, productRepo };
}

describe('PayOrderUseCase', () => {

    it('creates payment with SUCCESS status and transitions order to DELIVERY', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const product = makeProduct(10);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, product);

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);
        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result.order.state).toBe(OrderState.DELIVERY);
        expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
        expect(result.payment.orderId).toBe('order-1');
        expect(result.payment.amount).toBe(500);
    });

    it('deducts stock after successful payment', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const product = makeProduct(10);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, product);

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);
        await useCase.execute({ orderId: 'order-1' });

        expect(productRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'p1', stock: 8 }) // 10 - 2
        );
    });

    it('cancels order and throws when stock is insufficient', async () => {
        const order = makeOrder(OrderState.PAYMENT); // quantity: 2
        const product = makeProduct(1); // stock: 1 < 2
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, product);

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow('Insufficient stock');

        // Заказ должен быть отменён
        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
        // Платёж не должен быть создан
        expect(paymentRepo.save).not.toHaveBeenCalled();
        // Остатки не должны быть списаны
        expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('cancels order and throws when product is not found', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, null);

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow('not found');

        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('throws idempotency error when order is already in DELIVERY', async () => {
        const order = makeOrder(OrderState.DELIVERY);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(10));

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow('Payment already processed');

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('throws idempotency error when order is already CLOSED', async () => {
        const order = makeOrder(OrderState.CLOSED);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(10));

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow('Payment already processed');
    });

    it('throws if order not found', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(null, null);

        const useCase = new PayOrderUseCase(orderRepo, paymentRepo, productRepo);

        await expect(useCase.execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });
});
