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
  [AbsenceResolutionStrategy.AUTO_REMOVE]: 'Авто убрать',
  [AbsenceResolutionStrategy.AUTO_REPLACE]: 'Авто заменить',
};

interface ItemRowProps {
  item: OrderItemDto;
  onQtyChange: (productId: string, qty: number) => void;
  onAbsenceChange: (productId: string, strategy: AbsenceResolutionStrategy) => void;
  localQty: number;
  absenceStrategy: AbsenceResolutionStrategy;
}

function ItemRow({ item, onQtyChange, onAbsenceChange, localQty, absenceStrategy }: ItemRowProps) {
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
          <span className={styles.qtyValue}>{localQty}</span>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onQtyChange(item.productId, localQty + 1)}
          >
            +
          </button>
        </div>
        <select
          className={styles.absenceSelect}
          value={absenceStrategy}
          onChange={(e) =>
            onAbsenceChange(item.productId, e.target.value as AbsenceResolutionStrategy)
          }
        >
          {Object.values(AbsenceResolutionStrategy).map((s) => (
            <option key={s} value={s}>
              {ABSENCE_LABELS[s]}
            </option>
          ))}
        </select>
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

  const [localItems, setLocalItems] = useState<
    Record<string, { qty: number; absence: AbsenceResolutionStrategy }>
  >(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.productId,
        { qty: item.quantity, absence: order.absenceResolutionStrategy },
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

  const handleAbsenceChange = (productId: string, strategy: AbsenceResolutionStrategy) => {
    setLocalItems((prev) => ({ ...prev, [productId]: { ...prev[productId], absence: strategy } }));
    scheduleUpdate();
  };

  const localTotal = order.items.reduce((sum, item) => {
    return sum + item.price * (localItems[item.productId]?.qty ?? item.quantity);
  }, 0);

  const isNotStarted = order.state === OrderState.CREATED;
  const isPicking = order.state === OrderState.PICKING;

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
                absenceStrategy={
                  localItems[item.productId]?.absence ?? order.absenceResolutionStrategy
                }
                onQtyChange={handleQtyChange}
                onAbsenceChange={handleAbsenceChange}
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
