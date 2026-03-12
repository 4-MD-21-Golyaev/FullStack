import { Order } from './Order';
import { OrderState } from './OrderState';

export interface DeliverySlaMetrics {
    orderId: string;
    state: OrderState;
    /** Seconds since courier claimed the order (assignment to start-delivery SLA) */
    secondsSinceClaimed: number | null;
    /** Seconds since courier started delivery (en-route SLA) */
    secondsEnRoute: number | null;
    /** Total seconds from claim to delivery confirmation */
    totalDeliverySeconds: number | null;
    isEnRouteOverdue: boolean;
    isAssignmentOverdue: boolean;
}

/** SLA thresholds in seconds */
const EN_ROUTE_SLA_S = 60 * 60;       // 1 hour en-route
const ASSIGNMENT_SLA_S = 30 * 60;     // 30 min to start delivery after claim

export function calculateDeliverySla(order: Order, now = new Date()): DeliverySlaMetrics {
    const secondsSinceClaimed = order.deliveryClaimedAt
        ? Math.floor((now.getTime() - order.deliveryClaimedAt.getTime()) / 1000)
        : null;

    const secondsEnRoute = order.outForDeliveryAt
        ? order.deliveredAt
            ? Math.floor((order.deliveredAt.getTime() - order.outForDeliveryAt.getTime()) / 1000)
            : Math.floor((now.getTime() - order.outForDeliveryAt.getTime()) / 1000)
        : null;

    const totalDeliverySeconds =
        order.deliveryClaimedAt && order.deliveredAt
            ? Math.floor((order.deliveredAt.getTime() - order.deliveryClaimedAt.getTime()) / 1000)
            : null;

    const isEnRouteOverdue =
        secondsEnRoute !== null &&
        !order.deliveredAt &&
        secondsEnRoute > EN_ROUTE_SLA_S;

    const isAssignmentOverdue =
        secondsSinceClaimed !== null &&
        !order.outForDeliveryAt &&
        secondsSinceClaimed > ASSIGNMENT_SLA_S;

    return {
        orderId: order.id,
        state: order.state,
        secondsSinceClaimed,
        secondsEnRoute,
        totalDeliverySeconds,
        isEnRouteOverdue,
        isAssignmentOverdue,
    };
}
