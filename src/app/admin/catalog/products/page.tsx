'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { DataTable, FilterBar, Button, type Column } from '@/shared/ui';
import styles from './page.module.css';

const PAGE_SIZE = 20;

const COLUMNS: Column<ProductDto>[] = [
  { key: 'article', header: 'Артикул', width: '120px', render: (row) => row.article },
  { key: 'name', header: 'Наименование', render: (row) => row.name },
  {
    key: 'price',
    header: 'Цена',
    width: '110px',
    render: (row) => `${row.price.toLocaleString('ru')} ₽`,
  },
  {
    key: 'stock',
    header: 'Остаток',
    width: '100px',
    render: (row) => (
      <span style={{ color: row.stock === 0 ? 'var(--ctx-color-status-danger)' : undefined }}>
        {row.stock}
      </span>
    ),
  },
];

export default function AdminCatalogProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', { page, search }],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    staleTime: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => productsApi.syncProducts(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSyncResult(JSON.stringify(result?.result ?? result, null, 2));
    },
  });

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>Каталог — товары</h1>
        <Button
          variant="secondary"
          size="sm"
          loading={syncMutation.isPending}
          onClick={() => { setSyncResult(null); syncMutation.mutate(); }}
        >
          Синхронизировать с МойСклад
        </Button>
      </div>

      {syncResult && (
        <pre className={styles.syncResult}>{syncResult}</pre>
      )}

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Поиск по артикулу или названию..."
      />

      <DataTable
        columns={COLUMNS}
        data={data?.products ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        emptyText="Товары не найдены"
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
