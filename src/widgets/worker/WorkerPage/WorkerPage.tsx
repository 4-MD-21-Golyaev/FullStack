'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/shared/ui';
import type { OrderDto } from '@/lib/api/orders';
import styles from './WorkerPage.module.css';

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
      <h1 className={styles.title}>{title}</h1>

      {availableLoading ? (
        <div className={styles.centered}>
          <Spinner size="md" label="Загрузка..." />
        </div>
      ) : !availableData?.orders.length ? (
        <div className={styles.empty}>
          <p>Нет доступных заказов</p>
          <p className={styles.hint}>Список обновляется каждые 15 секунд</p>
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
