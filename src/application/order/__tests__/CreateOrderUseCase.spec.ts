import { describe, it, expect, vi } from 'vitest';
import { CreateOrderUseCase } from '../CreateOrderUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { OrderState } from '@/domain/order/OrderState';

const mockOrderRepo: OrderRepository = {
    save: vi.fn(),
    findById: vi.fn()
};

const mockProductRepo: ProductRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByCategoryId: vi.fn(),
    save: vi.fn(),
};

describe('CreateOrderUseCase', () => {

    it('creates and saves order using product data from repository', async () => {

        mockProductRepo.findById = vi.fn().mockResolvedValue({
            id: 'p1',
            name: 'Product 1',
            article: 'A1',
            price: 100,
            stock: 10,
            imagePath: null,
            categoryId: 'c1',
        });

        const useCase = new CreateOrderUseCase(
            mockOrderRepo,
            mockProductRepo
        );

        const order = await useCase.execute({
            userId: 'test-user',
            address: 'Test address 123',
            items: [
                {
                    productId: 'p1',
                    quantity: 2
                }
            ]
        });

        expect(order.state).toBe(OrderState.CREATED);
        expect(order.totalAmount).toBe(200);

        expect(mockProductRepo.findById).toHaveBeenCalledWith('p1');
        expect(mockOrderRepo.save).toHaveBeenCalled();
    });

});
