import { describe, it, expect } from 'vitest';
import {
    startPicking,
    registerPayment,
    startDelivery,
    closeOrder,
    cancelOrder,
} from '../transitions';
import { createOrder } from '../transitions';
import { OrderState } from '../OrderState';
import { InvalidOrderStateError } from '../errors';
import { AbsenceResolutionStrategy } from '../AbsenceResolutionStrategy';

const address = 'Test address 123';
const strategy = AbsenceResolutionStrategy.CALL_REPLACE;

const baseItems = [
    {
        productId: 'p1',
        name: 'Product 1',
        article: 'A1',
        quantity: 2,
        price: 100
    }
];

describe('Order lifecycle', () => {

    it('creates order in CREATED state', () => {
        const order = createOrder('1', 'user1', address, baseItems, strategy);

        expect(order.state).toBe(OrderState.CREATED);
        expect(order.totalAmount).toBe(200);
    });

    it('CREATED → PICKING', () => {
        const order = createOrder('1', 'user1', address, baseItems, strategy);
        const picking = startPicking(order);

        expect(picking.state).toBe(OrderState.PICKING);
    });

    it('PICKING → PAYMENT', () => {
        const order = startPicking(
            createOrder('1', 'user1', address, baseItems, strategy)
        );

        const paid = registerPayment(order);

        expect(paid.state).toBe(OrderState.PAYMENT);
    });

    it('PAYMENT → DELIVERY', () => {
        const order = registerPayment(
            startPicking(
                createOrder('1', 'user1', address, baseItems, strategy)
            )
        );

        const delivery = startDelivery(order);

        expect(delivery.state).toBe(OrderState.DELIVERY);
    });

    it('DELIVERY → CLOSED', () => {
        const order = startDelivery(
            registerPayment(
                startPicking(
                    createOrder('1', 'user1', address, baseItems, strategy)
                )
            )
        );

        const closed = closeOrder(order);

        expect(closed.state).toBe(OrderState.CLOSED);
    });

    it('allows cancelling CREATED', () => {
        const order = createOrder('1', 'user1', address, baseItems, strategy);
        const cancelled = cancelOrder(order);

        expect(cancelled.state).toBe(OrderState.CANCELLED);
    });

    it('allows cancelling PICKING', () => {
        const order = startPicking(
            createOrder('1', 'user1', address, baseItems, strategy)
        );

        const cancelled = cancelOrder(order);

        expect(cancelled.state).toBe(OrderState.CANCELLED);
    });

    it('allows cancelling PAYMENT', () => {
        const order = registerPayment(
            startPicking(
                createOrder('1', 'user1', address, baseItems, strategy)
            )
        );

        const cancelled = cancelOrder(order);

        expect(cancelled.state).toBe(OrderState.CANCELLED);
    });

    it('prevents cancelling DELIVERY', () => {
        const order = startDelivery(
            registerPayment(
                startPicking(
                    createOrder('1', 'user1', address, baseItems, strategy)
                )
            )
        );

        expect(() => cancelOrder(order))
            .toThrow(InvalidOrderStateError);
    });

    it('prevents cancelling CLOSED', () => {
        const order = closeOrder(
            startDelivery(
                registerPayment(
                    startPicking(
                        createOrder('1', 'user1', address, baseItems, strategy)
                    )
                )
            )
        );

        expect(() => cancelOrder(order))
            .toThrow(InvalidOrderStateError);
    });

});
