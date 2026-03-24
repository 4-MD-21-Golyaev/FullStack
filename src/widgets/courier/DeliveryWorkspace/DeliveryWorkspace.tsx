'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { courierApi } from '@/lib/api/courier';
import { SlaTimer, Button, ConfirmDialog } from '@/shared/ui';
import { OrderState } from '@/domain/order/OrderState';
import type { OrderDto } from '@/lib/api/orders';
import { MapPin } from 'lucide-react';
import styles from './DeliveryWorkspace.module.css';

const failSchema = z.object({
  reason: z.string().min(10, 'Минимум 10 символов'),
});
type FailForm = z.infer<typeof failSchema>;

interface Props {
  order: OrderDto;
}

export function DeliveryWorkspace({ order }: Props) {
  const queryClient = useQueryClient();
  const [showRelease, setShowRelease] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [showFailed, setShowFailed] = useState(false);

  const failForm = useForm<FailForm>({ resolver: zodResolver(failSchema) });

  const releaseMutation = useMutation({
    mutationFn: () => courierApi.release(order.id),
    onSuccess: () => {
      queryClient.setQueryData(['courier', 'me'], { order: null });
      setShowRelease(false);
    },
  });

  const startDeliveryMutation = useMutation({
    mutationFn: () => courierApi.startDelivery(order.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['courier', 'me'], { order: updated });
    },
  });

  const confirmDeliveredMutation = useMutation({
    mutationFn: () => courierApi.confirmDelivered(order.id),
    onSuccess: () => {
      queryClient.setQueryData(['courier', 'me'], { order: null });
      setShowDelivered(false);
    },
  });

  const markFailedMutation = useMutation({
    mutationFn: ({ reason }: FailForm) =>
      courierApi.markDeliveryFailed(order.id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['courier', 'me'], { order: updated });
      setShowFailed(false);
      failForm.reset();
    },
  });

  const isAssigned = order.state === OrderState.DELIVERY_ASSIGNED;
  const isEnRoute = order.state === OrderState.OUT_FOR_DELIVERY;

  const mapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(order.address)}`;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <span className={styles.orderId}>Заказ #{order.id.slice(0, 8)}</span>
          <span className={styles.total}>{order.totalAmount.toLocaleString('ru')} ₽</span>
        </div>
        {isAssigned && (
          <button className={styles.releaseBtn} onClick={() => setShowRelease(true)}>
            Освободить
          </button>
        )}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.addressCard}
      >
        <MapPin size={18} className={styles.mapPin} />
        <span className={styles.address}>{order.address}</span>
      </a>

      {/* SLA Timer */}
      <div className={styles.slaCard}>
        {isAssigned && order.deliveryClaimedAt && (
          <>
            <span className={styles.slaLabel}>До начала доставки</span>
            <SlaTimer startedAt={order.deliveryClaimedAt} limitSeconds={30 * 60} />
          </>
        )}
        {isEnRoute && order.outForDeliveryAt && (
          <>
            <span className={styles.slaLabel}>Время в пути</span>
            <SlaTimer startedAt={order.outForDeliveryAt} limitSeconds={60 * 60} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {isAssigned && (
          <Button
            variant="primary"
            size="lg"
            loading={startDeliveryMutation.isPending}
            onClick={() => startDeliveryMutation.mutate()}
          >
            Начать доставку
          </Button>
        )}

        {isEnRoute && (
          <>
            <Button
              variant="primary"
              size="lg"
              loading={confirmDeliveredMutation.isPending}
              onClick={() => setShowDelivered(true)}
            >
              Доставлено ✓
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => setShowFailed(true)}
            >
              Не удалось доставить
            </Button>
          </>
        )}
      </div>

      {/* Release dialog */}
      <ConfirmDialog
        open={showRelease}
        title="Освободить заказ?"
        description="Заказ вернётся в список доступных."
        confirmLabel="Освободить"
        variant="danger"
        loading={releaseMutation.isPending}
        onConfirm={() => releaseMutation.mutate()}
        onCancel={() => setShowRelease(false)}
      />

      {/* Confirm delivered */}
      <ConfirmDialog
        open={showDelivered}
        title="Подтвердить доставку?"
        description="Заказ будет отмечен как доставленный."
        confirmLabel="Да, доставлено"
        variant="primary"
        loading={confirmDeliveredMutation.isPending}
        onConfirm={() => confirmDeliveredMutation.mutate()}
        onCancel={() => setShowDelivered(false)}
      />

      {/* Mark failed */}
      <ConfirmDialog
        open={showFailed}
        title="Не удалось доставить?"
        confirmLabel="Подтвердить"
        variant="danger"
        loading={markFailedMutation.isPending}
        onConfirm={failForm.handleSubmit((data) => markFailedMutation.mutate(data))}
        onCancel={() => { setShowFailed(false); failForm.reset(); }}
      >
        <div className={styles.field}>
          <label className={styles.label}>Причина *</label>
          <textarea
            className={styles.textarea}
            placeholder="Опишите причину (минимум 10 символов)"
            {...failForm.register('reason')}
          />
          {failForm.formState.errors.reason && (
            <span className={styles.error}>{failForm.formState.errors.reason.message}</span>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
