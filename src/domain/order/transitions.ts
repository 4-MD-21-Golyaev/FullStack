import { Order } from './Order';
import { OrderState } from './OrderState';
import { InvalidOrderStateError } from './errors';
import { OrderItem } from './OrderItem';

function ensureState(order: Order, allowed: OrderState[]) {
    if (!allowed.includes(order.state)) {
        throw new InvalidOrderStateError(
            `Invalid transition from ${order.state}`
        );
    }
}

function cloneWithState(order: Order, state: OrderState): Order {
    return {
        ...order,
        state,
        updatedAt: new Date(),
    };
}

//////////////////////////////////////////////////////
// CREATE ORDER
//////////////////////////////////////////////////////

export function createOrder(
    id: string,
    userId: string,
    address: string,
    items: OrderItem[]
): Order {

    if (!items || items.length === 0) {
        throw new Error('Order must contain at least one item');
    }

    if (!address || address.trim().length === 0) {
        throw new Error('Address is required');
    }

    for (const item of items) {
        if (item.price < 0) {
            throw new Error('Item price cannot be negative');
        }
        if (item.quantity <= 0) {
            throw new Error('Item quantity must be positive');
        }
    }

    const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const now = new Date();

    return {
        id,
        userId,
        address,
        items,
        totalAmount,
        state: OrderState.CREATED,
        createdAt: now,
        updatedAt: now,
    };
}


//////////////////////////////////////////////////////
// CREATED → PICKING
//////////////////////////////////////////////////////

export function startPicking(order: Order): Order {
    ensureState(order, [OrderState.CREATED]);
    return cloneWithState(order, OrderState.PICKING);
}

//////////////////////////////////////////////////////
// PICKING → PAYMENT
//////////////////////////////////////////////////////

export function registerPayment(order: Order): Order {
    ensureState(order, [OrderState.PICKING]);
    return cloneWithState(order, OrderState.PAYMENT);
}

//////////////////////////////////////////////////////
// PAYMENT → DELIVERY
//////////////////////////////////////////////////////

export function startDelivery(order: Order): Order {
    ensureState(order, [OrderState.PAYMENT]);
    return cloneWithState(order, OrderState.DELIVERY);
}

//////////////////////////////////////////////////////
// DELIVERY → CLOSED
//////////////////////////////////////////////////////

export function closeOrder(order: Order): Order {
    ensureState(order, [OrderState.DELIVERY]);
    return cloneWithState(order, OrderState.CLOSED);
}

//////////////////////////////////////////////////////
// CANCEL
//////////////////////////////////////////////////////

export function cancelOrder(order: Order): Order {
    ensureState(order, [
        OrderState.CREATED,
        OrderState.PICKING,
        OrderState.PAYMENT,
    ]);

    return cloneWithState(order, OrderState.CANCELLED);
}
