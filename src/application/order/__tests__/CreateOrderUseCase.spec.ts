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

function makeOrderRepo(): OrderRepository {
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
    };
}

function makeProductRepo(resolvedProduct: any): ProductRepository {
    return {
        findById: vi.fn().mockResolvedValue(resolvedProduct),
        findByIds: vi.fn(),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        findByArticle: vi.fn(),
        save: vi.fn(),
    };
}

describe('CreateOrderUseCase', () => {

    it('creates and saves order using product data from repository', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1',
            name: 'Product 1',
            article: 'A1',
            price: 100,
            stock: 10,
            imagePath: null,
            categoryId: 'c1',
        });

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

    it('throws when items list is empty', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo(null);
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: 'Some address',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [],
        })).rejects.toThrow('Order must contain at least one item');
    });

    it('throws when product is not found', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo(null);
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: 'Some address',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'missing-product', quantity: 1 }],
        })).rejects.toThrow('Product missing-product not found');
    });

    it('throws when quantity is zero', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1', name: 'P', article: 'A', price: 50, stock: 10, imagePath: null, categoryId: 'c1',
        });
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: 'Some address',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: 0 }],
        })).rejects.toThrow('Quantity must be greater than zero');
    });

    it('throws when quantity is negative', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1', name: 'P', article: 'A', price: 50, stock: 10, imagePath: null, categoryId: 'c1',
        });
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: 'Some address',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: -3 }],
        })).rejects.toThrow('Quantity must be greater than zero');
    });

    it('throws when stock is insufficient', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1', name: 'P', article: 'A', price: 50, stock: 2, imagePath: null, categoryId: 'c1',
        });
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: 'Some address',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: 5 }],
        })).rejects.toThrow('Insufficient stock for product p1');
    });

    it('throws when address is empty', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1', name: 'P', article: 'A', price: 50, stock: 10, imagePath: null, categoryId: 'c1',
        });
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: '',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: 1 }],
        })).rejects.toThrow('Address is required');
    });

    it('throws when address is whitespace only', async () => {
        const mockOrderRepo = makeOrderRepo();
        const mockProductRepo = makeProductRepo({
            id: 'p1', name: 'P', article: 'A', price: 50, stock: 10, imagePath: null, categoryId: 'c1',
        });
        const useCase = new CreateOrderUseCase(makeTransactionRunner(mockOrderRepo, mockProductRepo));

        await expect(useCase.execute({
            userId: 'u1',
            address: '   ',
            absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
            items: [{ productId: 'p1', quantity: 1 }],
        })).rejects.toThrow('Address is required');
    });

});
