'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '@/lib/api/courier';
import { OrderDeliveryCard } from '@/components/courier/OrderDeliveryCard/OrderDeliveryCard';
import { DeliveryWorkspace } from '@/components/courier/DeliveryWorkspace/DeliveryWorkspace';
import { Spinner } from '@/components/ui';
import styles from './page.module.css';

export default function CourierPage() {
  const queryClient = useQueryClient();

  const { data: myOrderData, isLoading: myLoading } = useQuery({
    queryKey: ['courier', 'me'],
    queryFn: () => courierApi.myOrder(),
    refetchInterval: 15_000,
  });

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['courier', 'available'],
    queryFn: () => courierApi.available(),
    refetchInterval: 15_000,
    enabled: !myOrderData?.order,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => courierApi.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier', 'me'] });
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
    return <DeliveryWorkspace order={activeOrder} />;
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
            <OrderDeliveryCard
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
