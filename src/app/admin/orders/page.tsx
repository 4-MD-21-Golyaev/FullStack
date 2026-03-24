'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import {
  DataTable,
  FilterBar,
  OrderStatusBadge,
  type Column,
  type FilterOption,
} from '@/shared/ui';
import { OrderState } from '@/domain/order/OrderState';
import { ORDER_STATUS_CONFIG } from '@/lib/order-status-config';
import type { OrderDto } from '@/lib/api/orders';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './page.module.css';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: FilterOption[] = Object.values(OrderState)
  .filter((s) => s !== OrderState.DELIVERY)
  .map((s) => ({ value: s, label: ORDER_STATUS_CONFIG[s]?.label ?? s }));

function formatTimeInState(updatedAt: string): string {
  return formatDistanceToNow(new Date(updatedAt), { locale: ru, addSuffix: false });
}

const COLUMNS: Column<OrderDto>[] = [
  { key: 'id', header: 'ID', width: '100px', render: (row) => row.id.slice(0, 8) + '…' },
  { key: 'state', header: 'Статус', render: (row) => <OrderStatusBadge state={row.state} /> },
  { key: 'total', header: 'Сумма', render: (row) => `${row.totalAmount.toLocaleString('ru')} ₽` },
  { key: 'address', header: 'Адрес', render: (row) => row.address },
  {
    key: 'createdAt',
    header: 'Создан',
    render: (row) => new Date(row.createdAt).toLocaleDateString('ru'),
  },
  {
    key: 'timeInState',
    header: 'В статусе',
    render: (row) => formatTimeInState(row.updatedAt),
  },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', { page, search, statuses, dateFrom, dateTo }],
    queryFn: () =>
      ordersApi.adminList({
        search: search || undefined,
        status: statuses.length > 0 ? statuses : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    staleTime: 30_000,
  });

  function handleFilterChange(update: { search?: string; statuses?: string[]; dateFrom?: string; dateTo?: string }) {
    setPage(1);
    if (update.search !== undefined) setSearch(update.search);
    if (update.statuses !== undefined) setStatuses(update.statuses);
    if (update.dateFrom !== undefined) setDateFrom(update.dateFrom);
    if (update.dateTo !== undefined) setDateTo(update.dateTo);
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Заказы</h1>

      <FilterBar
        search={search}
        onSearchChange={(v) => handleFilterChange({ search: v })}
        searchPlaceholder="Поиск по ID, email, телефону..."
        statusOptions={STATUS_OPTIONS}
        selectedStatuses={statuses}
        onStatusChange={(v) => handleFilterChange({ statuses: v })}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(v) => handleFilterChange({ dateFrom: v })}
        onDateToChange={(v) => handleFilterChange({ dateTo: v })}
      />

      <DataTable
        columns={COLUMNS}
        data={data?.orders ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        emptyText="Заказы не найдены"
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
