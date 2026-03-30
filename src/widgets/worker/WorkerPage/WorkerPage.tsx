'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, RefreshCw } from 'lucide-react';
import { Button, Spinner } from '@/shared/ui';
import type { OrderDto } from '@/lib/api/orders';
import styles from './WorkerPage.module.css';

const REFRESH_INTERVAL = 15;

interface WorkerApi {
  myOrder(): Promise<{ order: OrderDto | null }>;
  available(): Promise<{ orders: OrderDto[] }>;
  claim(id: string): Promise<unknown>;
}

interface WorkerPageProps {
  queryKey: string;
  api: WorkerApi;
  WorkspaceComponent: React.ComponentType<{ order: OrderDto }>;
  CardComponent: React.ComponentType<{ order: OrderDto; onClaim(id: string): void; isClaiming: boolean }>;
  title?: string;
}

export function WorkerPage({ queryKey, api, WorkspaceComponent, CardComponent, title = 'Доступные заказы' }: WorkerPageProps) {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const { data: myOrderData, isLoading: myLoading } = useQuery({
    queryKey: [queryKey, 'me'],
    queryFn: () => api.myOrder(),
    refetchInterval: 15_000,
  });

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: [queryKey, 'available'],
    queryFn: () => api.available(),
    refetchInterval: 15_000,
    enabled: !myOrderData?.order,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => api.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'me'] });
    },
  });

  // Countdown timer — paused when in workspace mode
  useEffect(() => {
    if (myOrderData?.order) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [myOrderData?.order]);

  // Reset countdown after refetch
  useEffect(() => {
    setCountdown(REFRESH_INTERVAL);
  }, [availableData]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey, 'available'] });
    queryClient.invalidateQueries({ queryKey: [queryKey, 'me'] });
    setCountdown(REFRESH_INTERVAL);
  }, [queryClient, queryKey]);

  if (myLoading) {
    return (
      <div className={styles.centered}>
        <Spinner size="lg" label="Загрузка..." />
      </div>
    );
  }

  const activeOrder = myOrderData?.order;

  if (activeOrder) {
    return <WorkspaceComponent order={activeOrder} />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.listHeader}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.refreshSection}>
          <span className={styles.refreshHint}>Обновление через {countdown} с</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className={styles.refreshBtn}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {availableLoading ? (
        <div className={styles.centered}>
          <Spinner size="md" label="Загрузка..." />
        </div>
      ) : !availableData?.orders.length ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Package size={28} color="var(--ctx-color-text-secondary)" />
          </div>
          <p className={styles.emptyTitle}>Нет заказов</p>
          <p className={styles.emptySubtitle}>Обновление через {countdown} с</p>
        </div>
      ) : (
        <div className={styles.list}>
          {availableData.orders.map((order) => (
            <CardComponent
              key={order.id}
              order={order}
              onClaim={(id) => claimMutation.mutate(id)}
              isClaiming={claimMutation.isPending && claimMutation.variables === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
