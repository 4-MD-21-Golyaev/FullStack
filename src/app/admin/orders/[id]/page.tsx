'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api/orders';
import { AdminOrderDetail } from '@/widgets/admin/AdminOrderDetail/AdminOrderDetail';
import { Spinner } from '@/shared/ui';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: Props) {
  const { id } = use(params);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: () => ordersApi.getOrder(id),
  });

  if (isLoading) {
    return <div className={styles.loading}><Spinner size="lg" label="Загрузка..." /></div>;
  }

  if (!order) {
    return <div className={styles.error}>Заказ не найден</div>;
  }

  return <AdminOrderDetail order={order} />;
}
