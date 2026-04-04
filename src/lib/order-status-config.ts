import { OrderState } from '@/domain/order/OrderState';

export interface OrderStatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderState, OrderStatusConfig> = {
  [OrderState.CREATED]: {
    label: 'Создан',
    color: 'var(--ctx-color-order-created-text)',
    bgColor: 'var(--ctx-color-order-created-bg)',
  },
  [OrderState.PICKING]: {
    label: 'Сборка',
    color: 'var(--ctx-color-order-picking-text)',
    bgColor: 'var(--ctx-color-order-picking-bg)',
  },
  [OrderState.PAYMENT]: {
    label: 'Оплата',
    color: 'var(--ctx-color-order-payment-text)',
    bgColor: 'var(--ctx-color-order-payment-bg)',
  },
  [OrderState.DELIVERY]: {
    label: 'Доставка',
    color: 'var(--ctx-color-order-delivery-text)',
    bgColor: 'var(--ctx-color-order-delivery-bg)',
  },
  [OrderState.DELIVERY_ASSIGNED]: {
    label: 'Назначен курьер',
    color: 'var(--ctx-color-order-delivery-text)',
    bgColor: 'var(--ctx-color-order-delivery-bg)',
  },
  [OrderState.OUT_FOR_DELIVERY]: {
    label: 'В пути',
    color: 'var(--ctx-color-order-delivery-text)',
    bgColor: 'var(--ctx-color-order-delivery-bg)',
  },
  [OrderState.DELIVERED]: {
    label: 'Доставлен',
    color: 'var(--ctx-color-order-delivered-text)',
    bgColor: 'var(--ctx-color-order-delivered-bg)',
  },
  [OrderState.CLOSED]: {
    label: 'Закрыт',
    color: 'var(--ctx-color-order-closed-text)',
    bgColor: 'var(--ctx-color-order-closed-bg)',
  },
  [OrderState.CANCELLED]: {
    label: 'Отменён',
    color: 'var(--ctx-color-order-cancelled-text)',
    bgColor: 'var(--ctx-color-order-cancelled-bg)',
  },
};

/** Ordered list for State Timeline — canonical display order */
export const ORDER_STATE_TIMELINE: OrderState[] = [
  OrderState.CREATED,
  OrderState.PICKING,
  OrderState.PAYMENT,
  OrderState.DELIVERY_ASSIGNED,
  OrderState.OUT_FOR_DELIVERY,
  OrderState.DELIVERED,
  OrderState.CLOSED,
];

export function getOrderStatusConfig(state: OrderState): OrderStatusConfig {
  return ORDER_STATUS_CONFIG[state] ?? ORDER_STATUS_CONFIG[OrderState.CREATED];
}

export interface CustomerOrderStatusConfig {
  label: string;
  bgColor: string; // hardcoded from Figma — no ctx token for these shades
}

export const CUSTOMER_ORDER_STATUS_CONFIG: Record<OrderState, CustomerOrderStatusConfig> = {
  [OrderState.CREATED]:           { label: 'В сборке',         bgColor: '#AF3732' },
  [OrderState.PICKING]:           { label: 'В сборке',         bgColor: '#AF3732' },
  [OrderState.PAYMENT]:           { label: 'Готов к оплате',   bgColor: '#AF3732' },
  [OrderState.DELIVERY]:          { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.DELIVERY_ASSIGNED]: { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.OUT_FOR_DELIVERY]:  { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.DELIVERED]:         { label: 'Доставлен', bgColor: '#8F2D29' },
  [OrderState.CLOSED]:            { label: 'Доставлен', bgColor: '#8F2D29' },
  [OrderState.CANCELLED]:         { label: 'Отменен',   bgColor: '#620C04' },
};

export function getCustomerOrderStatusConfig(state: OrderState): CustomerOrderStatusConfig {
  return CUSTOMER_ORDER_STATUS_CONFIG[state] ?? CUSTOMER_ORDER_STATUS_CONFIG[OrderState.CREATED];
}
