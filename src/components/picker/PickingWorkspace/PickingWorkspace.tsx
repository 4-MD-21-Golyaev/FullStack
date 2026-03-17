'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, type OrderItemDto, type OrderDto } from '@/lib/api/orders';
import { pickerApi } from '@/lib/api/picker';
import { Button, ConfirmDialog } from '@/components/ui';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { OrderState } from '@/domain/order/OrderState';
import styles from './PickingWorkspace.module.css';

const ABSENCE_LABELS: Record<AbsenceResolutionStrategy, string> = {
  [AbsenceResolutionStrategy.CALL_REPLACE]: 'Позвонить — заменить',
  [AbsenceResolutionStrategy.CALL_REMOVE]: 'Позвонить — убрать',
  [AbsenceResolutionStrategy.AUTO_REMOVE]: 'Убрать автоматически',
  [AbsenceResolutionStrategy.AUTO_REPLACE]: 'Заменить автоматически',
};

const CALL_STRATEGIES = new Set<AbsenceResolutionStrategy>([
  AbsenceResolutionStrategy.CALL_REPLACE,
  AbsenceResolutionStrategy.CALL_REMOVE,
]);

interface ItemRowProps {
  item: OrderItemDto;
  onQtyChange: (productId: string, qty: number) => void;
  localQty: number;
  maxQty: number;
}

function ItemRow({ item, onQtyChange, localQty, maxQty }: ItemRowProps) {
  return (
    <div className={styles.itemRow}>
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemArticle}>{item.article}</span>
        <span className={styles.itemPrice}>{item.price.toLocaleString('ru')} ₽</span>
      </div>
      <div className={styles.itemControls}>
        <div className={styles.qtySpinner}>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onQtyChange(item.productId, Math.max(0, localQty - 1))}
          >
            −
          </button>
          <span className={styles.qtyValue}>{localQty} / {maxQty}</span>
          <button
            type="button"
            className={styles.qtyBtn}
            disabled={localQty >= maxQty}
            onClick={() => onQtyChange(item.productId, localQty + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div className={styles.itemSubtotal}>
        {(item.price * localQty).toLocaleString('ru')} ₽
      </div>
    </div>
  );
}

interface Props {
  order: OrderDto;
}

export function PickingWorkspace({ order }: Props) {
  const queryClient = useQueryClient();
  const [showRelease, setShowRelease] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const [localItems, setLocalItems] = useState<Record<string, { qty: number; maxQty: number }>>(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.productId,
        { qty: item.quantity, maxQty: item.quantity },
      ]),
    ),
  );

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMutation = useMutation({
    mutationFn: (items: OrderItemDto[]) => ordersApi.updateItems(order.id, items),
    onSuccess: (updated) => {
      queryClient.setQueryData(['picker', 'me'], { order: updated });
    },
  });

  const startPickingMutation = useMutation({
    mutationFn: () => ordersApi.startPicking(order.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['picker', 'me'], { order: updated });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => ordersApi.completePicking(order.id),
    onSuccess: () => {
      queryClient.setQueryData(['picker', 'me'], { order: null });
      setShowComplete(false);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => pickerApi.release(order.id),
    onSuccess: () => {
      queryClient.setQueryData(['picker', 'me'], { order: null });
      setShowRelease(false);
    },
  });

  const scheduleUpdate = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const items = order.items.map((item) => ({
        ...item,
        quantity: localItems[item.productId]?.qty ?? item.quantity,
      }));
      updateMutation.mutate(items);
    }, 500);
  }, [localItems, order.items, updateMutation]);

  const handleQtyChange = (productId: string, qty: number) => {
    setLocalItems((prev) => ({ ...prev, [productId]: { ...prev[productId], qty } }));
    scheduleUpdate();
  };

  const localTotal = order.items.reduce((sum, item) => {
    return sum + item.price * (localItems[item.productId]?.qty ?? item.quantity);
  }, 0);

  const isNotStarted = order.state === OrderState.CREATED;
  const isPicking = order.state === OrderState.PICKING;
  const needsCall = CALL_STRATEGIES.has(order.absenceResolutionStrategy);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.orderId}>Заказ #{order.id.slice(0, 8)}</span>
          <span className={styles.total}>{localTotal.toLocaleString('ru')} ₽</span>
        </div>
        <button className={styles.releaseBtn} onClick={() => setShowRelease(true)}>
          Освободить
        </button>
      </div>

      <p className={styles.address}>{order.address}</p>

      <div className={styles.absenceInfo}>
        <span className={styles.absenceLabel}>При отсутствии товара:</span>
        <span className={styles.absenceValue}>{ABSENCE_LABELS[order.absenceResolutionStrategy]}</span>
        {needsCall && order.customerPhone && (
          <span className={styles.customerPhone}>Телефон: {order.customerPhone}</span>
        )}
      </div>

      {isNotStarted && (
        <Button
          variant="primary"
          size="lg"
          loading={startPickingMutation.isPending}
          onClick={() => startPickingMutation.mutate()}
        >
          Начать сборку
        </Button>
      )}

      {isPicking && (
        <>
          <div className={styles.items}>
            {order.items.map((item) => (
              <ItemRow
                key={item.productId}
                item={item}
                localQty={localItems[item.productId]?.qty ?? item.quantity}
                maxQty={localItems[item.productId]?.maxQty ?? item.quantity}
                onQtyChange={handleQtyChange}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            loading={completeMutation.isPending}
            onClick={() => setShowComplete(true)}
          >
            Завершить сборку
          </Button>
        </>
      )}

      <ConfirmDialog
        open={showRelease}
        title="Освободить заказ?"
        description="Заказ вернётся в общий список."
        confirmLabel="Освободить"
        variant="danger"
        loading={releaseMutation.isPending}
        onConfirm={() => releaseMutation.mutate()}
        onCancel={() => setShowRelease(false)}
      />

      <ConfirmDialog
        open={showComplete}
        title="Завершить сборку?"
        description="Заказ перейдёт в статус PAYMENT."
        confirmLabel="Завершить"
        variant="primary"
        loading={completeMutation.isPending}
        onConfirm={() => completeMutation.mutate()}
        onCancel={() => setShowComplete(false)}
      />
    </div>
  );
}
