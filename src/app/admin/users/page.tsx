'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usersApi, type UserDto } from '@/lib/api/users';
import { DataTable, type Column } from '@/components/ui';
import styles from './page.module.css';

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  PICKER: 'Сборщик',
  STAFF: 'Сборщик',
  COURIER: 'Курьер',
  CUSTOMER: 'Клиент',
};

const COLUMNS: Column<UserDto>[] = [
  { key: 'email', header: 'Email', render: (row) => row.email },
  { key: 'phone', header: 'Телефон', render: (row) => row.phone || '—' },
  {
    key: 'role',
    header: 'Роль',
    render: (row) => ROLE_LABELS[row.role] ?? row.role,
    width: '140px',
  },
  {
    key: 'createdAt',
    header: 'Зарегистрирован',
    render: (row) => new Date(row.createdAt).toLocaleDateString('ru'),
    width: '160px',
  },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () =>
      usersApi.list({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    staleTime: 60_000,
  });

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Пользователи</h1>
      <DataTable
        columns={COLUMNS}
        data={data?.users ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        emptyText="Пользователи не найдены"
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
