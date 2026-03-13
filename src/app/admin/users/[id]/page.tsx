'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { ordersApi, type OrderDto } from '@/lib/api/orders';
import { DataTable, OrderStatusBadge, type Column } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

const ORDER_COLUMNS: Column<OrderDto>[] = [
  { key: 'id', header: 'ID', width: '100px', render: (row) => row.id.slice(0, 8) + '…' },
  { key: 'state', header: 'Статус', render: (row) => <OrderStatusBadge state={row.state} /> },
  {
    key: 'total',
    header: 'Сумма',
    width: '120px',
    render: (row) => `${row.totalAmount.toLocaleString('ru')} ₽`,
  },
  {
    key: 'createdAt',
    header: 'Дата',
    width: '120px',
    render: (row) => new Date(row.createdAt).toLocaleDateString('ru'),
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  PICKER: 'Сборщик',
  STAFF: 'Сборщик',
  COURIER: 'Курьер',
  CUSTOMER: 'Клиент',
};

export default function AdminUserDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => usersApi.getUser(id),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'users', id, 'orders'],
    queryFn: () => ordersApi.adminList({ search: user?.email, limit: 50 }),
    enabled: !!user?.email,
  });

  if (userLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!user) {
    return <div className={styles.error}>Пользователь не найден</div>;
  }

  return (
    <div className={styles.root}>
      <button className={styles.back} onClick={() => router.back()}>
        <ArrowLeft size={16} /> Назад
      </button>

      <div className={styles.card}>
        <h1 className={styles.title}>Профиль</h1>
        <dl className={styles.dl}>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Телефон</dt><dd>{user.phone || '—'}</dd>
          <dt>Роль</dt><dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
          <dt>Адрес</dt><dd>{user.address || '—'}</dd>
          <dt>Зарегистрирован</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString('ru')}</dd>
        </dl>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>История заказов</h2>
        <DataTable
          columns={ORDER_COLUMNS}
          data={ordersData?.orders ?? []}
          loading={ordersLoading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
          emptyText="Заказов нет"
        />
      </div>
    </div>
  );
}
