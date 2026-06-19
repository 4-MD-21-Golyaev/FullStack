import { describe, it, expect, vi } from 'vitest';
import { PrismaProductRepository } from '../ProductRepository.prisma';

function makeDecimal(value: number) {
    return { toNumber: () => value };
}

function makeDbRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: 'product-1',
        name: 'Apple Juice',
        article: 'AJ-001',
        price: makeDecimal(150),
        stock: 10,
        imagePath: '/images/apple-juice.jpg',
        categoryId: 'cat-1',
        ...overrides,
    };
}

function makeDb(findManyResult: unknown[] = []) {
    return {
        product: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn().mockResolvedValue(findManyResult),
            upsert: vi.fn(),
        },
    };
}

describe('PrismaProductRepository.findBySearch', () => {
    it('returns products matching by name', async () => {
        const record = makeDbRecord({ name: 'Apple Juice', article: 'AJ-001' });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findBySearch('Apple', 10);

        expect(db.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { name: { contains: 'Apple', mode: 'insensitive' } },
                        { article: { contains: 'Apple', mode: 'insensitive' } },
                    ],
                },
            })
        );
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Apple Juice');
    });

    it('returns products matching by article', async () => {
        const record = makeDbRecord({ name: 'Apple Juice', article: 'AJ-001' });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findBySearch('AJ-001', 10);

        expect(db.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { name: { contains: 'AJ-001', mode: 'insensitive' } },
                        { article: { contains: 'AJ-001', mode: 'insensitive' } },
                    ],
                },
            })
        );
        expect(results).toHaveLength(1);
        expect(results[0].article).toBe('AJ-001');
    });

    it('passes mode insensitive for case-insensitive matching', async () => {
        const record = makeDbRecord({ name: 'Apple Juice', article: 'AJ-001' });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        await repo.findBySearch('apple', 10);

        const call = db.product.findMany.mock.calls[0][0];
        expect(call.where.OR[0]).toEqual({ name: { contains: 'apple', mode: 'insensitive' } });
        expect(call.where.OR[1]).toEqual({ article: { contains: 'apple', mode: 'insensitive' } });
    });

    it('returns empty array when no products match', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findBySearch('nonexistent-xyz', 10);

        expect(results).toEqual([]);
    });

    it('respects the limit via take parameter', async () => {
        const records = [
            makeDbRecord({ id: 'p-1', name: 'A Product 1' }),
            makeDbRecord({ id: 'p-2', name: 'A Product 2' }),
            makeDbRecord({ id: 'p-3', name: 'A Product 3' }),
        ];
        const db = makeDb(records);
        const repo = new PrismaProductRepository(db as any);

        await repo.findBySearch('product', 3);

        const call = db.product.findMany.mock.calls[0][0];
        expect(call.take).toBe(3);
    });

    it('orders results by name ascending', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        await repo.findBySearch('juice', 10);

        const call = db.product.findMany.mock.calls[0][0];
        expect(call.orderBy).toEqual({ name: 'asc' });
    });

    it('maps Decimal price to number via toNumber()', async () => {
        const record = makeDbRecord({ price: makeDecimal(299.99) });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findBySearch('Apple', 10);

        expect(results[0].price).toBe(299.99);
    });
});

describe('PrismaProductRepository.findById', () => {
    it('returns mapped product when record exists', async () => {
        const record = makeDbRecord();
        const db = makeDb();
        db.product.findUnique.mockResolvedValue(record);
        const repo = new PrismaProductRepository(db as any);

        const result = await repo.findById('product-1');

        expect(db.product.findUnique).toHaveBeenCalledWith({ where: { id: 'product-1' } });
        expect(result).not.toBeNull();
        expect(result!.id).toBe('product-1');
        expect(result!.price).toBe(150);
    });

    it('returns null when record does not exist', async () => {
        const db = makeDb();
        db.product.findUnique.mockResolvedValue(null);
        const repo = new PrismaProductRepository(db as any);

        const result = await repo.findById('missing-id');

        expect(result).toBeNull();
    });

    it('preserves null imagePath', async () => {
        const record = makeDbRecord({ imagePath: null });
        const db = makeDb();
        db.product.findUnique.mockResolvedValue(record);
        const repo = new PrismaProductRepository(db as any);

        const result = await repo.findById('product-1');

        expect(result!.imagePath).toBeNull();
    });
});

describe('PrismaProductRepository.findByIds', () => {
    it('returns mapped products for given ids', async () => {
        const records = [
            makeDbRecord({ id: 'p-1', name: 'Product 1' }),
            makeDbRecord({ id: 'p-2', name: 'Product 2' }),
        ];
        const db = makeDb(records);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByIds(['p-1', 'p-2']);

        expect(db.product.findMany).toHaveBeenCalledWith({ where: { id: { in: ['p-1', 'p-2'] } } });
        expect(results).toHaveLength(2);
    });

    it('returns empty array without querying db when ids is empty', async () => {
        const db = makeDb();
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByIds([]);

        expect(db.product.findMany).not.toHaveBeenCalled();
        expect(results).toEqual([]);
    });
});

describe('PrismaProductRepository.findAll', () => {
    it('returns all products ordered by name asc', async () => {
        const records = [
            makeDbRecord({ id: 'p-1', name: 'Banana' }),
            makeDbRecord({ id: 'p-2', name: 'Apple' }),
        ];
        const db = makeDb(records);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findAll();

        expect(db.product.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
        expect(results).toHaveLength(2);
    });

    it('returns empty array when no products exist', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findAll();

        expect(results).toEqual([]);
    });
});

describe('PrismaProductRepository.findByCategoryId', () => {
    it('returns products for the given category ordered by name asc', async () => {
        const record = makeDbRecord({ categoryId: 'cat-1' });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByCategoryId('cat-1');

        expect(db.product.findMany).toHaveBeenCalledWith({
            where: { categoryId: 'cat-1' },
            orderBy: { name: 'asc' },
        });
        expect(results).toHaveLength(1);
        expect(results[0].categoryId).toBe('cat-1');
    });

    it('returns empty array when category has no products', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByCategoryId('empty-cat');

        expect(results).toEqual([]);
    });
});

describe('PrismaProductRepository.findByCategoryIds', () => {
    it('returns products for given category ids ordered by name asc', async () => {
        const records = [
            makeDbRecord({ id: 'p-1', categoryId: 'cat-1' }),
            makeDbRecord({ id: 'p-2', categoryId: 'cat-2' }),
        ];
        const db = makeDb(records);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByCategoryIds(['cat-1', 'cat-2']);

        expect(db.product.findMany).toHaveBeenCalledWith({
            where: {
                categoryId: { in: ['cat-1', 'cat-2'] },
                imagePath: { not: '' },
                NOT: { name: { startsWith: '*' } },
            },
            orderBy: { name: 'asc' },
        });
        expect(results).toHaveLength(2);
    });

    it('filters out placeholder-image products via imagePath: { not: empty } alongside categoryId in', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        await repo.findByCategoryIds(['cat-1']);

        const call = db.product.findMany.mock.calls[0][0];
        expect(call.where).toEqual({
            categoryId: { in: ['cat-1'] },
            imagePath: { not: '' },
            NOT: { name: { startsWith: '*' } },
        });
        expect(call.where.imagePath).toEqual({ not: '' });
        expect(call.where.NOT).toEqual({ name: { startsWith: '*' } });
        expect(call.where.categoryId).toEqual({ in: ['cat-1'] });
    });

    it('orders results by name ascending', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRepository(db as any);

        await repo.findByCategoryIds(['cat-1']);

        const call = db.product.findMany.mock.calls[0][0];
        expect(call.orderBy).toEqual({ name: 'asc' });
    });

    it('maps Decimal price to number via toNumber()', async () => {
        const record = makeDbRecord({ categoryId: 'cat-1', price: makeDecimal(42.5) });
        const db = makeDb([record]);
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByCategoryIds(['cat-1']);

        expect(results[0].price).toBe(42.5);
        expect(typeof results[0].price).toBe('number');
    });

    it('returns empty array without querying db when categoryIds is empty', async () => {
        const db = makeDb();
        const repo = new PrismaProductRepository(db as any);

        const results = await repo.findByCategoryIds([]);

        expect(db.product.findMany).not.toHaveBeenCalled();
        expect(results).toEqual([]);
    });
});

describe('PrismaProductRepository.findByArticle', () => {
    it('returns mapped product when article exists', async () => {
        const record = makeDbRecord({ article: 'AJ-001' });
        const db = makeDb();
        db.product.findFirst.mockResolvedValue(record);
        const repo = new PrismaProductRepository(db as any);

        const result = await repo.findByArticle('AJ-001');

        expect(db.product.findFirst).toHaveBeenCalledWith({ where: { article: 'AJ-001' } });
        expect(result).not.toBeNull();
        expect(result!.article).toBe('AJ-001');
    });

    it('returns null when article does not exist', async () => {
        const db = makeDb();
        db.product.findFirst.mockResolvedValue(null);
        const repo = new PrismaProductRepository(db as any);

        const result = await repo.findByArticle('MISSING');

        expect(result).toBeNull();
    });
});

describe('PrismaProductRepository.save', () => {
    it('calls upsert with correct create and update fields', async () => {
        const db = makeDb();
        db.product.upsert.mockResolvedValue(undefined);
        const repo = new PrismaProductRepository(db as any);

        const product = {
            id: 'product-1',
            name: 'Apple Juice',
            article: 'AJ-001',
            price: 150,
            stock: 10,
            imagePath: '/images/apple-juice.jpg',
            categoryId: 'cat-1',
        };

        await repo.save(product);

        expect(db.product.upsert).toHaveBeenCalledWith({
            where: { id: 'product-1' },
            update: {
                name: 'Apple Juice',
                article: 'AJ-001',
                price: 150,
                stock: 10,
                imagePath: '/images/apple-juice.jpg',
                categoryId: 'cat-1',
            },
            create: {
                id: 'product-1',
                name: 'Apple Juice',
                article: 'AJ-001',
                price: 150,
                stock: 10,
                imagePath: '/images/apple-juice.jpg',
                categoryId: 'cat-1',
            },
        });
    });

    it('saves product with null imagePath', async () => {
        const db = makeDb();
        db.product.upsert.mockResolvedValue(undefined);
        const repo = new PrismaProductRepository(db as any);

        const product = {
            id: 'product-2',
            name: 'Mystery Item',
            article: 'MI-999',
            price: 50,
            stock: 0,
            imagePath: null,
            categoryId: 'cat-2',
        };

        await repo.save(product);

        const call = db.product.upsert.mock.calls[0][0];
        expect(call.create.imagePath).toBeNull();
        expect(call.update.imagePath).toBeNull();
    });
});
