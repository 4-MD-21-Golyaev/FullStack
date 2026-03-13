'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  SlaTimer,
  ConfirmDialog,
  Button,
} from '@/components/ui';
import { ORDER_STATE_TIMELINE, getOrderStatusConfig } from '@/lib/order-status-config';
import { OrderState } from '@/domain/order/OrderState';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'close' | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: () => ordersApi.getOrder(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      setConfirmAction(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => ordersApi.closeOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      setConfirmAction(null);
    },
  });

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!order) {
    return <div className={styles.error}>Заказ не найден</div>;
  }

  const canCancel = [OrderState.CREATED, OrderState.PICKING, OrderState.PAYMENT].includes(order.state);
  const canClose = order.state === OrderState.DELIVERED;

  const currentStateIndex = ORDER_STATE_TIMELINE.findIndex((s) => s === order.state);

  return (
    <div className={styles.root}>
      <button className={styles.back} onClick={() => router.back()}>
        <ArrowLeft size={16} /> Назад к списку
      </button>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказ #{id.slice(0, 8)}</h1>
          <OrderStatusBadge state={order.state} />
        </div>
        <div className={styles.actions}>
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
              Отменить
            </Button>
          )}
          {canClose && (
            <Button variant="secondary" onClick={() => setConfirmAction('close')}>
              Закрыть
            </Button>
          )}
        </div>
      </div>

      {/* State Timeline */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Lifecycle</h2>
        <div className={styles.timeline}>
          {ORDER_STATE_TIMELINE.map((state, i) => {
            const isCurrent = i === currentStateIndex;
            const isDone = i < currentStateIndex;
            const config = getOrderStatusConfig(state);
            return (
              <div key={state} className={styles.timelineItem}>
                <div
                  className={`${styles.timelineIcon} ${isCurrent ? styles.timelineIconCurrent : isDone ? styles.timelineIconDone : ''}`}
                  style={isCurrent ? { color: config.color } : undefined}
                >
                  {isDone ? <CheckCircle size={18} /> : <Circle size={18} />}
                </div>
                <span
                  className={`${styles.timelineLabel} ${isCurrent ? styles.timelineLabelCurrent : ''}`}
                >
                  {config.label}
                </span>
                {i < ORDER_STATE_TIMELINE.length - 1 && (
                  <div className={`${styles.timelineConnector} ${isDone ? styles.timelineConnectorDone : ''}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Позиции ({order.items.length})</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Артикул</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}</td>
                <td className={styles.secondary}>{item.article}</td>
                <td>{item.quantity}</td>
                <td>{item.price.toLocaleString('ru')} ₽</td>
                <td>{(item.price * item.quantity).toLocaleString('ru')} ₽</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className={styles.totalLabel}>Итого</td>
              <td className={styles.totalValue}>{order.totalAmount.toLocaleString('ru')} ₽</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.cards2col}>
        {/* Payment */}
        {order.payment && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Платёж</h2>
            <dl className={styles.dl}>
              <dt>Статус</dt>
              <dd><PaymentStatusBadge status={order.payment.status} /></dd>
              <dt>Сумма</dt>
              <dd>{order.payment.amount.toLocaleString('ru')} ₽</dd>
              {order.payment.externalId && (
                <>
                  <dt>External ID</dt>
                  <dd className={styles.mono}>{order.payment.externalId}</dd>
                </>
              )}
              <dt>Создан</dt>
              <dd>
                {formatDistanceToNow(new Date(order.payment.createdAt), {
                  locale: ru,
                  addSuffix: true,
                })}
              </dd>
            </dl>
          </div>
        )}

        {/* Picker */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Сборщик</h2>
          <dl className={styles.dl}>
            {order.pickerClaimUserId ? (
              <>
                <dt>ID</dt>
                <dd className={styles.mono}>{order.pickerClaimUserId.slice(0, 8)}</dd>
                {order.pickerClaimedAt && (
                  <>
                    <dt>Взял</dt>
                    <dd>
                      {formatDistanceToNow(new Date(order.pickerClaimedAt), {
                        locale: ru,
                        addSuffix: true,
                      })}
                    </dd>
                  </>
                )}
              </>
            ) : (
              <dt className={styles.secondary}>Не назначен</dt>
            )}
          </dl>
        </div>

        {/* Courier */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Курьер</h2>
          <dl className={styles.dl}>
            {order.deliveryClaimUserId ? (
              <>
                <dt>ID</dt>
                <dd className={styles.mono}>{order.deliveryClaimUserId.slice(0, 8)}</dd>
                {order.deliveryClaimedAt && (
                  <>
                    <dt>SLA (назначение)</dt>
                    <dd>
                      <SlaTimer
                        startedAt={order.deliveryClaimedAt}
                        limitSeconds={30 * 60}
                      />
                    </dd>
                  </>
                )}
                {order.outForDeliveryAt && (
                  <>
                    <dt>SLA (в пути)</dt>
                    <dd>
                      <SlaTimer
                        startedAt={order.outForDeliveryAt}
                        limitSeconds={60 * 60}
                      />
                    </dd>
                  </>
                )}
                {order.deliveredAt && (
                  <>
                    <dt>Доставлен</dt>
                    <dd>
                      {formatDistanceToNow(new Date(order.deliveredAt), {
                        locale: ru,
                        addSuffix: true,
                      })}
                    </dd>
                  </>
                )}
              </>
            ) : (
              <dt className={styles.secondary}>Не назначен</dt>
            )}
          </dl>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="Отменить заказ?"
        description="Заказ будет переведён в статус CANCELLED. Это действие нельзя отменить."
        confirmLabel="Да, отменить"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'close'}
        title="Закрыть заказ?"
        description="Заказ будет переведён в статус CLOSED."
        confirmLabel="Закрыть"
        variant="primary"
        loading={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
