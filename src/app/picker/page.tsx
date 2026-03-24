'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pickerApi } from '@/lib/api/picker';
import { OrderPickCard } from '@/widgets/picker/OrderPickCard/OrderPickCard';
import { PickingWorkspace } from '@/widgets/picker/PickingWorkspace/PickingWorkspace';
import { Spinner } from '@/shared/ui';
import styles from './page.module.css';

export default function PickerPage() {
  const queryClient = useQueryClient();

  const { data: myOrderData, isLoading: myLoading } = useQuery({
    queryKey: ['picker', 'me'],
    queryFn: () => pickerApi.myOrder(),
    refetchInterval: 15_000,
  });

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['picker', 'available'],
    queryFn: () => pickerApi.available(),
    refetchInterval: 15_000,
    enabled: !myOrderData?.order,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => pickerApi.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picker', 'me'] });
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
    return <PickingWorkspace order={activeOrder} />;
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Доступные заказы</h1>

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
            <OrderPickCard
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
