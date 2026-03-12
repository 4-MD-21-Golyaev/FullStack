import { Order } from './Order';
import { OrderState } from './OrderState';
import { InvalidOrderStateError } from './errors';
import { OrderItem } from './OrderItem';
import { AbsenceResolutionStrategy } from './AbsenceResolutionStrategy';

function ensureState(order: Order, allowed: OrderState[]) {
    if (!allowed.includes(order.state)) {
        throw new InvalidOrderStateError(
            `Invalid transition from ${order.state}`
        );
    }
}

function cloneWithState(order: Order, state: OrderState, extra?: Partial<Order>): Order {
    return {
        ...order,
        state,
        updatedAt: new Date(),
        ...extra,
    };
}

//////////////////////////////////////////////////////
// CREATE ORDER
//////////////////////////////////////////////////////

export function createOrder(
    id: string,
    userId: string,
    address: string,
    items: OrderItem[],
    absenceResolutionStrategy: AbsenceResolutionStrategy
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
        absenceResolutionStrategy,
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
// PAYMENT → DELIVERY_ASSIGNED
//////////////////////////////////////////////////////

export function startDelivery(order: Order): Order {
    ensureState(order, [OrderState.PAYMENT]);
    return cloneWithState(order, OrderState.DELIVERY_ASSIGNED);
}

//////////////////////////////////////////////////////
// DELIVERY_ASSIGNED → OUT_FOR_DELIVERY
//////////////////////////////////////////////////////

export function startOutForDelivery(order: Order): Order {
    // Also accept legacy DELIVERY for backward compat with existing records
    ensureState(order, [OrderState.DELIVERY_ASSIGNED, OrderState.DELIVERY]);
    return cloneWithState(order, OrderState.OUT_FOR_DELIVERY, {
        outForDeliveryAt: new Date(),
    });
}

//////////////////////////////////////////////////////
// OUT_FOR_DELIVERY → DELIVERED
//////////////////////////////////////////////////////

export function confirmDelivered(order: Order): Order {
    ensureState(order, [OrderState.OUT_FOR_DELIVERY]);
    return cloneWithState(order, OrderState.DELIVERED, {
        deliveredAt: new Date(),
    });
}

//////////////////////////////////////////////////////
// OUT_FOR_DELIVERY → DELIVERY_ASSIGNED  (retry)
//////////////////////////////////////////////////////

export function markDeliveryFailed(order: Order): Order {
    ensureState(order, [OrderState.OUT_FOR_DELIVERY]);
    return cloneWithState(order, OrderState.DELIVERY_ASSIGNED, {
        outForDeliveryAt: null,
        deliveryClaimUserId: null,
        deliveryClaimedAt: null,
    });
}

//////////////////////////////////////////////////////
// DELIVERED → CLOSED
//////////////////////////////////////////////////////

export function closeOrder(order: Order): Order {
    // Accept DELIVERED (new) or legacy DELIVERY for backward compat
    ensureState(order, [OrderState.DELIVERED, OrderState.DELIVERY]);
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
