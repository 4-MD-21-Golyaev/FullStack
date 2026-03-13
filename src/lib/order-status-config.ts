import { OrderState } from '@/domain/order/OrderState';

export interface OrderStatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderState, OrderStatusConfig> = {
  [OrderState.CREATED]: {
    label: 'Создан',
    color: 'var(--ctx-color-order-created)',
    bgColor: 'var(--primitive-color-blue-50)',
  },
  [OrderState.PICKING]: {
    label: 'Сборка',
    color: 'var(--ctx-color-order-picking)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.PAYMENT]: {
    label: 'Оплата',
    color: 'var(--ctx-color-order-payment)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.DELIVERY]: {
    label: 'Доставка',
    color: 'var(--ctx-color-order-delivery-assigned)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.DELIVERY_ASSIGNED]: {
    label: 'Назначен курьер',
    color: 'var(--ctx-color-order-delivery-assigned)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.OUT_FOR_DELIVERY]: {
    label: 'В пути',
    color: 'var(--ctx-color-order-out-for-delivery)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.DELIVERED]: {
    label: 'Доставлен',
    color: 'var(--ctx-color-order-delivered)',
    bgColor: 'var(--primitive-color-neutral-50)',
  },
  [OrderState.CLOSED]: {
    label: 'Закрыт',
    color: 'var(--ctx-color-order-closed)',
    bgColor: 'var(--primitive-color-neutral-100)',
  },
  [OrderState.CANCELLED]: {
    label: 'Отменён',
    color: 'var(--ctx-color-order-cancelled)',
    bgColor: 'var(--primitive-color-neutral-50)',
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
