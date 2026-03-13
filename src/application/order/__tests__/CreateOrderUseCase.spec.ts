import { describe, it, expect, vi } from 'vitest';
import { CreateOrderUseCase } from '../CreateOrderUseCase';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderRepository } from '../../ports/OrderRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

function makeTransactionRunner(orderRepo: any, productRepo: any): TransactionRunner {
    return {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: orderRepo,
                paymentRepository: {} as any,
                productRepository: productRepo,
                outboxRepository: { save: vi.fn(), claimPending: vi.fn(), markProcessed: vi.fn(), markFailed: vi.fn(), incrementRetry: vi.fn() },
                    auditLogRepository: {} as any,
            })
        ),
    };
}

describe('CreateOrderUseCase', () => {

    it('creates and saves order using product data from repository', async () => {
        const mockOrderRepo: OrderRepository = {
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
        };

        const mockProductRepo: ProductRepository = {
            findById: vi.fn().mockResolvedValue({
                id: 'p1',
                name: 'Product 1',
                article: 'A1',
                price: 100,
                stock: 10,
                imagePath: null,
                categoryId: 'c1',
            }),
            findByIds: vi.fn(),
            findAll: vi.fn(),
            findByCategoryId: vi.fn(),
            findByArticle: vi.fn(),
            save: vi.fn(),
        };

        const useCase = new CreateOrderUseCase(
            makeTransactionRunner(mockOrderRepo, mockProductRepo)
        );

        const order = await useCase.execute({
            userId: 'test-user',
            address: 'Test address 123',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: 2 }],
        });

        expect(order.state).toBe(OrderState.CREATED);
        expect(order.totalAmount).toBe(200);

        expect(mockProductRepo.findById).toHaveBeenCalledWith('p1');
        expect(mockOrderRepo.save).toHaveBeenCalled();
    });

});
