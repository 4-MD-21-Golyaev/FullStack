import { describe, it, expect, vi } from 'vitest';
import { PrismaOrderRepository } from '../OrderRepository.prisma';

function makeDecimal(value: number) {
    return { toNumber: () => value };
}

function makeDbItem(overrides: Record<string, unknown> = {}) {
    return {
        productId: 'prod-1',
        name: 'Milk',
        article: 'MLK-001',
        price: makeDecimal(120),
        quantity: 2,
        product: { imagePath: '/images/milk.jpg' },
        ...overrides,
    };
}

function makeDbOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: 'order-1',
        userId: 'user-1',
        totalAmount: makeDecimal(240),
        address: '123 Main St',
        status: { code: 'CREATED' },
        absenceResolutionStrategy: { code: 'WAIT' },
        user: null,
        pickerClaimUserId: null,
        pickerClaimedAt: null,
        deliveryClaimUserId: null,
        deliveryClaimedAt: null,
        outForDeliveryAt: null,
        deliveredAt: null,
        moySkladId: null,
        scheduledDate: null,
        scheduledTimeSlot: null,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:05:00Z'),
        items: [makeDbItem()],
        ...overrides,
    };
}

function makeDb() {
    return {
        order: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            upsert: vi.fn(),
            count: vi.fn(),
        },
        orderStatus: {
            findUnique: vi.fn(),
        },
        absenceResolutionStrategy: {
            findUnique: vi.fn(),
        },
    };
}

// ── findByUserId ──────────────────────────────────────────────────────────────

describe('PrismaOrderRepository.findByUserId', () => {
    it('returns orders with imageSrc when product has imagePath', async () => {
        const item = makeDbItem({ product: { imagePath: '/images/milk.jpg' } });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders).toHaveLength(1);
        expect(orders[0].items[0].imageSrc).toBe('/images/milk.jpg');
    });

    it('returns orders with imageSrc: null when product has null imagePath', async () => {
        const item = makeDbItem({ product: { imagePath: null } });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders[0].items[0].imageSrc).toBeNull();
    });

    it('returns orders with imageSrc: null when product is null (no join result)', async () => {
        const item = makeDbItem({ product: null });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders[0].items[0].imageSrc).toBeNull();
    });

    it('returns empty array when user has no orders', async () => {
        const db = makeDb();
        db.order.findMany.mockResolvedValue([]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-with-no-orders');

        expect(orders).toEqual([]);
    });

    it('queries with correct userId and orders by createdAt desc', async () => {
        const db = makeDb();
        db.order.findMany.mockResolvedValue([]);
        const repo = new PrismaOrderRepository(db as any);

        await repo.findByUserId('user-1');

        expect(db.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1' },
                orderBy: { createdAt: 'desc' },
            })
        );
    });

    it('maps Decimal totalAmount and price via toNumber()', async () => {
        const item = makeDbItem({ price: makeDecimal(99.5) });
        const record = makeDbOrder({ totalAmount: makeDecimal(199), items: [item] });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders[0].totalAmount).toBe(199);
        expect(orders[0].items[0].price).toBe(99.5);
    });

    it('maps order state from status.code', async () => {
        const record = makeDbOrder({ status: { code: 'PICKING' } });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders[0].state).toBe('PICKING');
    });

    it('includes imageSrc for multiple items with mixed imagePath', async () => {
        const items = [
            makeDbItem({ productId: 'p-1', product: { imagePath: '/img/a.jpg' } }),
            makeDbItem({ productId: 'p-2', product: { imagePath: null } }),
            makeDbItem({ productId: 'p-3', product: null }),
        ];
        const record = makeDbOrder({ items });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findByUserId('user-1');

        expect(orders[0].items[0].imageSrc).toBe('/img/a.jpg');
        expect(orders[0].items[1].imageSrc).toBeNull();
        expect(orders[0].items[2].imageSrc).toBeNull();
    });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe('PrismaOrderRepository.findById', () => {
    it('returns order with imageSrc when product has imagePath', async () => {
        const item = makeDbItem({ product: { imagePath: '/images/milk.jpg' } });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(record);
        const repo = new PrismaOrderRepository(db as any);

        const order = await repo.findById('order-1');

        expect(order).not.toBeNull();
        expect(order!.items[0].imageSrc).toBe('/images/milk.jpg');
    });

    it('returns order with imageSrc: null when product has null imagePath', async () => {
        const item = makeDbItem({ product: { imagePath: null } });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(record);
        const repo = new PrismaOrderRepository(db as any);

        const order = await repo.findById('order-1');

        expect(order!.items[0].imageSrc).toBeNull();
    });

    it('returns order with imageSrc: null when product is null', async () => {
        const item = makeDbItem({ product: null });
        const record = makeDbOrder({ items: [item] });
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(record);
        const repo = new PrismaOrderRepository(db as any);

        const order = await repo.findById('order-1');

        expect(order!.items[0].imageSrc).toBeNull();
    });

    it('returns null when order does not exist', async () => {
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(null);
        const repo = new PrismaOrderRepository(db as any);

        const order = await repo.findById('missing-id');

        expect(order).toBeNull();
    });

    it('queries with correct id', async () => {
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(null);
        const repo = new PrismaOrderRepository(db as any);

        await repo.findById('order-abc');

        expect(db.order.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'order-abc' } })
        );
    });

    it('maps Decimal totalAmount and price via toNumber()', async () => {
        const item = makeDbItem({ price: makeDecimal(55.5) });
        const record = makeDbOrder({ totalAmount: makeDecimal(111), items: [item] });
        const db = makeDb();
        db.order.findUnique.mockResolvedValue(record);
        const repo = new PrismaOrderRepository(db as any);

        const order = await repo.findById('order-1');

        expect(order!.totalAmount).toBe(111);
        expect(order!.items[0].price).toBe(55.5);
    });
});

// ── findAvailableForPicking ───────────────────────────────────────────────────

describe('PrismaOrderRepository.findAvailableForPicking', () => {
    it('queries with correct where clause and SLA-first orderBy (scheduledDate asc nulls last, createdAt asc)', async () => {
        const db = makeDb();
        db.order.findMany.mockResolvedValue([]);
        const repo = new PrismaOrderRepository(db as any);

        await repo.findAvailableForPicking();

        expect(db.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    status: { code: { in: ['CREATED', 'PICKING'] } },
                    pickerClaimUserId: null,
                },
                orderBy: [
                    { scheduledDate: { sort: 'asc', nulls: 'last' } },
                    { createdAt: 'asc' },
                ],
            })
        );
    });

    it('returns orders in the order the database returns them (DB applies orderBy)', async () => {
        // The DB applies the ORDER BY; the repository must preserve that order.
        // This fixture simulates the expected DB output: earlier scheduledDate first,
        // then later scheduledDate, then NULL scheduledDate; createdAt breaks ties.
        const earlySla = makeDbOrder({
            id: 'order-early-sla',
            scheduledDate: new Date('2024-01-02T09:00:00Z'),
            createdAt: new Date('2024-01-01T15:00:00Z'),
        });
        const sameSlaEarlier = makeDbOrder({
            id: 'order-same-sla-earlier-created',
            scheduledDate: new Date('2024-01-03T09:00:00Z'),
            createdAt: new Date('2024-01-01T10:00:00Z'),
        });
        const sameSlaLater = makeDbOrder({
            id: 'order-same-sla-later-created',
            scheduledDate: new Date('2024-01-03T09:00:00Z'),
            createdAt: new Date('2024-01-01T12:00:00Z'),
        });
        const noSla = makeDbOrder({
            id: 'order-no-sla',
            scheduledDate: null,
            createdAt: new Date('2024-01-01T08:00:00Z'),
        });

        const db = makeDb();
        // DB returns rows already sorted per the orderBy contract.
        db.order.findMany.mockResolvedValue([earlySla, sameSlaEarlier, sameSlaLater, noSla]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findAvailableForPicking();

        expect(orders.map(o => o.id)).toEqual([
            'order-early-sla',
            'order-same-sla-earlier-created',
            'order-same-sla-later-created',
            'order-no-sla',
        ]);
    });

    it('returns empty array when no orders are available', async () => {
        const db = makeDb();
        db.order.findMany.mockResolvedValue([]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findAvailableForPicking();

        expect(orders).toEqual([]);
    });

    it('maps scheduledDate through toOrder', async () => {
        const scheduled = new Date('2024-01-05T09:00:00Z');
        const record = makeDbOrder({ scheduledDate: scheduled });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findAvailableForPicking();

        expect(orders[0].scheduledDate).toEqual(scheduled);
    });

    it('maps null scheduledDate through toOrder', async () => {
        const record = makeDbOrder({ scheduledDate: null });
        const db = makeDb();
        db.order.findMany.mockResolvedValue([record]);
        const repo = new PrismaOrderRepository(db as any);

        const orders = await repo.findAvailableForPicking();

        expect(orders[0].scheduledDate).toBeNull();
    });
});
