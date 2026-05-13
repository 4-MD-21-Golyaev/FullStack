'use client';

import { useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, type OrderItemDto, type OrderDto } from '@/lib/api/orders';
import { pickerApi } from '@/lib/api/picker';
import { Button, ConfirmDialog, Counter } from '@/shared/ui';
import { CheckCircle2, XCircle, ArrowLeftRight } from 'lucide-react';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { OrderState } from '@/domain/order/OrderState';
import { ProductSearchModal, type ProductSearchResult } from '@/features/product-search';
import styles from './PickingWorkspace.module.css';

function ItemPhoto({ src, name }: { src?: string | null; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className={styles.itemPhoto}
      />
    );
  }
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <div className={styles.itemPhotoFallback} aria-hidden="true">
      {initial}
    </div>
  );
}

function formatPricePerUnit(price: number) {
  return `${price.toLocaleString('ru')} ₽/шт`;
}

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

const REPLACE_STRATEGIES = new Set<AbsenceResolutionStrategy>([
  AbsenceResolutionStrategy.AUTO_REPLACE,
  AbsenceResolutionStrategy.CALL_REPLACE,
]);

type ItemLocalState = {
  qty: number;
  maxQty: number;
  absent: boolean;
  replacementProductIds: string[];
  processedAt?: number; // incrementing counter, set when item first leaves unprocessed state
};

type ReplacementLocalState = {
  name: string;
  article: string;
  price: number;
  qty: number;
  replacementFor: string;
};

type ItemMode = 'unprocessed' | 'collected' | 'absent' | 'replaced';

function deriveMode(state: ItemLocalState): ItemMode {
  if (state.absent && state.replacementProductIds.length > 0) return 'replaced';
  if (state.absent) return 'absent';
  if (state.qty > 0) return 'collected';
  return 'unprocessed';
}

interface ItemRowProps {
  item: OrderItemDto;
  mode: ItemMode;
  localQty: number;
  maxQty: number;
  onQtyChange: (productId: string, qty: number) => void;
  onMarkAbsent: (productId: string) => void;
  onRestore: (productId: string) => void;
  onAddReplacement?: (productId: string) => void;
}

function ItemRow({ item, mode, localQty, maxQty, onQtyChange, onMarkAbsent, onRestore, onAddReplacement }: ItemRowProps) {
  return (
    <motion.div
      className={styles.itemRow}
      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
      animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className={styles.itemHeader}>
        <ItemPhoto src={item.imageSrc} name={item.name} />
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{item.name}</span>
          <div className={styles.itemMeta}>
            <span className={styles.itemArticle}>Арт. {item.article}</span>
            <span className={styles.itemMetaSep} aria-hidden="true">·</span>
            <span className={styles.itemPrice}>{formatPricePerUnit(item.price)}</span>
          </div>
        </div>
      </div>

      <div className={styles.itemControls}>
        {mode !== 'absent' ? (
          <>
            <div className={styles.qtyWrapper}>
              <Counter
                value={localQty}
                min={0}
                max={maxQty}
                size="lg"
                className={styles.counter}
                onChange={(qty) => onQtyChange(item.productId, qty)}
              />
              <span className={styles.maxQty}>/ {maxQty}</span>
            </div>
            <Button
              variant="danger"
              size="sm"
              className={styles.absentBtn}
              onClick={() => onMarkAbsent(item.productId)}
            >
              Отсутствует
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRestore(item.productId)}
            >
              Восстановить
            </Button>
            {onAddReplacement && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onAddReplacement(item.productId)}
              >
                Выбрать замену
              </Button>
            )}
          </>
        )}
      </div>

    </motion.div>
  );
}

interface ItemGroupProps {
  title: string;
  count: number;
  accent?: 'default' | 'absent' | 'collected' | 'replaced';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function ItemGroup({ title, count, accent = 'default', icon, children }: ItemGroupProps) {
  return (
    <motion.div
      className={`${styles.group} ${styles[`accent_${accent}`]}`}
      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
      animate={{ opacity: 1, height: 'auto', overflow: 'hidden' }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className={styles.groupHeader}>
        <div className={styles.groupHeaderLeft}>
          {icon}
          <span className={styles.groupTitle}>{title}</span>
        </div>
        <span className={styles.groupCount}>{count}</span>
      </div>
      <div className={styles.groupItems}>{children}</div>
    </motion.div>
  );
}

interface Props {
  order: OrderDto;
}

export function PickingWorkspace({ order }: Props) {
  const queryClient = useQueryClient();
  const [showRelease, setShowRelease] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  // Capture initial items once — server may later drop qty=0 items from order.items
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allItems = useMemo(() => order.items, []);

  const [localItems, setLocalItems] = useState<Record<string, ItemLocalState>>(() =>
    Object.fromEntries(
      allItems.map(item => [item.productId, { qty: 0, maxQty: item.quantity, absent: false, replacementProductIds: [] }])
    )
  );
  const localItemsRef = useRef(localItems);
  useLayoutEffect(() => { localItemsRef.current = localItems; });

  const processedCounterRef = useRef(0);

  const [replacements, setReplacements] = useState<Record<string, ReplacementLocalState>>({});
  const replacementsRef = useRef(replacements);
  useLayoutEffect(() => { replacementsRef.current = replacements; });

  const [searchForProductId, setSearchForProductId] = useState<string | null>(null);

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

  const scheduleUpdate = useCallback(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const snapshot = localItemsRef.current;
      const repsSnapshot = replacementsRef.current;
      const originalItems = allItems.map(item => ({
        ...item,
        quantity: snapshot[item.productId]?.absent ? 0 : (snapshot[item.productId]?.qty ?? 0),
      }));
      const replacementItems = Object.entries(repsSnapshot).map(([productId, r]) => ({
        productId,
        name: r.name,
        article: r.article,
        price: r.price,
        quantity: r.qty,
      }));
      updateMutation.mutate([...originalItems, ...replacementItems]);
    }, 500);
  }, [allItems, updateMutation]);

  const completeMutation = useMutation({
    mutationFn: () => {
      const snapshot = localItemsRef.current;
      const unprocessedIds = allItems
        .filter(i => deriveMode(snapshot[i.productId]) === 'unprocessed')
        .map(i => i.productId);
      return ordersApi.completePicking(order.id, unprocessedIds);
    },
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

  const handleQtyChange = useCallback((productId: string, qty: number) => {
    setLocalItems(prev => {
      const current = prev[productId];
      const wasUnprocessed = deriveMode(current) === 'unprocessed';
      return {
        ...prev,
        [productId]: {
          ...current,
          qty,
          absent: false,
          processedAt: wasUnprocessed && qty > 0 ? ++processedCounterRef.current : current.processedAt,
        },
      };
    });
    scheduleUpdate();
  }, [scheduleUpdate]);

  const handleMarkAbsent = useCallback((productId: string) => {
    setLocalItems(prev => ({
      ...prev,
      [productId]: { ...prev[productId], absent: true, qty: 0, processedAt: ++processedCounterRef.current },
    }));
    scheduleUpdate();
  }, [scheduleUpdate]);

  const handleRestore = useCallback((productId: string) => {
    const repIds = localItemsRef.current[productId]?.replacementProductIds ?? [];
    setReplacements(prev => {
      const next = { ...prev };
      repIds.forEach(id => delete next[id]);
      return next;
    });
    setLocalItems(prev => ({ ...prev, [productId]: { ...prev[productId], absent: false, qty: 0, replacementProductIds: [], processedAt: undefined } }));
    scheduleUpdate();
  }, [scheduleUpdate]);

  const handleSelectReplacement = useCallback((absentProductId: string, product: ProductSearchResult) => {
    const repId = product.id;
    setReplacements(prev => ({
      ...prev,
      [repId]: { name: product.name, article: product.article, price: product.price, qty: 1, replacementFor: absentProductId },
    }));
    setLocalItems(prev => ({
      ...prev,
      [absentProductId]: {
        ...prev[absentProductId],
        replacementProductIds: [...prev[absentProductId].replacementProductIds, repId],
      },
    }));
    setSearchForProductId(null);
    scheduleUpdate();
  }, [scheduleUpdate]);

  const handleRemoveReplacement = useCallback((absentProductId: string, replacementProductId: string) => {
    setReplacements(prev => {
      const next = { ...prev };
      delete next[replacementProductId];
      return next;
    });
    setLocalItems(prev => ({
      ...prev,
      [absentProductId]: {
        ...prev[absentProductId],
        replacementProductIds: prev[absentProductId].replacementProductIds.filter(id => id !== replacementProductId),
      },
    }));
    scheduleUpdate();
  }, [scheduleUpdate]);

  const handleReplacementQtyChange = useCallback((replacementProductId: string, qty: number) => {
    setReplacements(prev => ({ ...prev, [replacementProductId]: { ...prev[replacementProductId], qty } }));
    scheduleUpdate();
  }, [scheduleUpdate]);

  // Derive groups
  const unprocessed = allItems.filter(i => deriveMode(localItems[i.productId]) === 'unprocessed');

  const byProcessedDesc = (a: OrderItemDto, b: OrderItemDto) =>
    (localItems[b.productId]?.processedAt ?? 0) - (localItems[a.productId]?.processedAt ?? 0);

  const absent = allItems.filter(i => deriveMode(localItems[i.productId]) === 'absent').sort(byProcessedDesc);
  const collected = allItems.filter(i => deriveMode(localItems[i.productId]) === 'collected').sort(byProcessedDesc);
  const replaced = allItems.filter(i => deriveMode(localItems[i.productId]) === 'replaced').sort(byProcessedDesc);

  // Completion guards (UI-side enforcement of ADR-003)
  const isReplaceStrategy = REPLACE_STRATEGIES.has(order.absenceResolutionStrategy);
  const canComplete =
    unprocessed.length === 0 &&
    (collected.length > 0 || replaced.length > 0);

  let completeHint = '';
  if (unprocessed.length > 0) {
    completeHint = `Необработано: ${unprocessed.length} поз.`;
  } else if (collected.length === 0 && replaced.length === 0) {
    completeHint = 'Нет собранных товаров';
  }
  if (!completeHint && isReplaceStrategy && absent.length > 0) {
    completeHint = `${absent.length} поз. без замены — будут удалены из заказа`;
  }

  const canReplaceAbsent = order.absenceResolutionStrategy !== AbsenceResolutionStrategy.AUTO_REMOVE;

  const isNotStarted = order.state === OrderState.CREATED;
  const isPicking = order.state === OrderState.PICKING;

  if (isPicking && allItems.length === 0) {
    return <p className={styles.address}>Ошибка: заказ не содержит товаров.</p>;
  }

  const needsCall = CALL_STRATEGIES.has(order.absenceResolutionStrategy);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.orderTag}>#{order.id.slice(0, 8)}</span>
        </div>
        <div className={styles.headerActions}>
          {needsCall && order.customerPhone && (
            <Button href={`tel:${order.customerPhone}`} variant="secondary" size="sm">
              Позвонить
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowRelease(true)}>
            Освободить
          </Button>
        </div>
      </div>

      <div className={`${styles.absenceBanner} ${CALL_STRATEGIES.has(order.absenceResolutionStrategy) ? styles.absenceBannerCall : ''}`}>
        <span className={styles.absenceBannerLabel}>При отсутствии</span>
        <span className={styles.absenceBannerValue}>{ABSENCE_LABELS[order.absenceResolutionStrategy]}</span>
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
          <div className={styles.progressBlock}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Прогресс сборки</span>
              <span className={styles.progressCount}>
                {collected.length + absent.length + replaced.length} / {allItems.length}
              </span>
            </div>
            <div className={styles.progressTrack}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${((collected.length + absent.length + replaced.length) / allItems.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          <AnimatePresence mode="sync">
          {unprocessed.length > 0 && (
            <ItemGroup key="unprocessed" title="Необработано" count={unprocessed.length}>
              <AnimatePresence mode="popLayout">
                {unprocessed.map(item => (
                  <ItemRow
                    key={item.productId}
                    item={item}
                    mode="unprocessed"
                    localQty={localItems[item.productId]?.qty ?? 0}
                    maxQty={localItems[item.productId]?.maxQty ?? item.quantity}
                    onQtyChange={handleQtyChange}
                    onMarkAbsent={handleMarkAbsent}
                    onRestore={handleRestore}
                  />
                ))}
              </AnimatePresence>
            </ItemGroup>
          )}

          {absent.length > 0 && (
            <ItemGroup key="absent" title="Отсутствует" count={absent.length} accent="absent" icon={<XCircle size={14} />}>
              <AnimatePresence mode="popLayout">
                {absent.map(item => (
                  <ItemRow
                    key={item.productId}
                    item={item}
                    mode="absent"
                    localQty={0}
                    maxQty={localItems[item.productId]?.maxQty ?? item.quantity}
                    onQtyChange={handleQtyChange}
                    onMarkAbsent={handleMarkAbsent}
                    onRestore={handleRestore}
                    onAddReplacement={canReplaceAbsent ? (id) => setSearchForProductId(id) : undefined}
                  />
                ))}
              </AnimatePresence>
            </ItemGroup>
          )}

          {replaced.length > 0 && (
            <ItemGroup key="replaced" title="Заменено" count={replaced.length} accent="replaced" icon={<ArrowLeftRight size={14} />}>
              <AnimatePresence mode="popLayout">
                {replaced.map(item => {
                  const repIds = localItems[item.productId]?.replacementProductIds ?? [];
                  return (
                    <div key={item.productId} className={styles.replacedBlock}>
                      {/* Исходный товар */}
                      <div className={styles.absentOriginal}>
                        <div className={styles.itemHeader}>
                          <ItemPhoto src={item.imageSrc} name={item.name} />
                          <div className={styles.itemInfo}>
                            <span className={styles.itemName}>{item.name}</span>
                            <div className={styles.itemMeta}>
                              <span className={styles.itemArticle}>Арт. {item.article}</span>
                              <span className={styles.itemMetaSep} aria-hidden="true">·</span>
                              <span className={styles.itemPrice}>{formatPricePerUnit(item.price)}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(item.productId)}>
                          Восстановить
                        </Button>
                      </div>
                      {/* Замены */}
                      {repIds.map(repId => {
                        const rep = replacements[repId];
                        if (!rep) return null;
                        return (
                          <div key={repId} className={styles.replacementRow}>
                            <div className={styles.itemHeader}>
                              <ItemPhoto src={null} name={rep.name} />
                              <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{rep.name}</span>
                                <div className={styles.itemMeta}>
                                  <span className={styles.itemArticle}>Арт. {rep.article}</span>
                                  <span className={styles.itemMetaSep} aria-hidden="true">·</span>
                                  <span className={styles.itemPrice}>{formatPricePerUnit(rep.price)}</span>
                                </div>
                              </div>
                            </div>
                            <div className={styles.itemControls}>
                              <Counter
                                value={rep.qty}
                                min={1}
                                size="lg"
                                className={styles.counter}
                                onChange={(qty) => handleReplacementQtyChange(repId, qty)}
                              />
                              <Button variant="danger" size="sm" onClick={() => handleRemoveReplacement(item.productId, repId)}>
                                Убрать
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Добавить ещё замену */}
                      {canReplaceAbsent && (
                        <Button variant="ghost" size="sm" onClick={() => setSearchForProductId(item.productId)}>
                          + Ещё замену
                        </Button>
                      )}
                    </div>
                  );
                })}
              </AnimatePresence>
            </ItemGroup>
          )}

          {collected.length > 0 && (
            <ItemGroup key="collected" title="Собрано" count={collected.length} accent="collected" icon={<CheckCircle2 size={14} />}>
              <AnimatePresence mode="popLayout">
                {collected.map(item => (
                  <ItemRow
                    key={item.productId}
                    item={item}
                    mode="collected"
                    localQty={localItems[item.productId]?.qty ?? 0}
                    maxQty={localItems[item.productId]?.maxQty ?? item.quantity}
                    onQtyChange={handleQtyChange}
                    onMarkAbsent={handleMarkAbsent}
                    onRestore={handleRestore}
                  />
                ))}
              </AnimatePresence>
            </ItemGroup>
          )}
          </AnimatePresence>

          <motion.div
            className={styles.completeSectionWrap}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
          >
            <div className={styles.completeSection}>
              {completeHint && <p className={styles.completeHint}>{completeHint}</p>}
              <Button
                variant="primary"
                size="lg"
                disabled={!canComplete}
                loading={completeMutation.isPending}
                onClick={() => setShowComplete(true)}
              >
                Завершить сборку
              </Button>
            </div>
          </motion.div>
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

      <ProductSearchModal
        open={searchForProductId !== null}
        onSelect={(product) => {
          if (searchForProductId) handleSelectReplacement(searchForProductId, product);
        }}
        onClose={() => setSearchForProductId(null)}
      />
    </div>
  );
}
