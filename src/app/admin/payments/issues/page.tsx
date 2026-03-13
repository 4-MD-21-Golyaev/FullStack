'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { paymentsApi, type PaymentIssueDto } from '@/lib/api/payments';
import { DataTable, ConfirmDialog, Button, type Column } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import styles from './page.module.css';

const reasonSchema = z.object({
  reason: z.string().min(5, 'Минимум 5 символов'),
});
type ReasonForm = z.infer<typeof reasonSchema>;

function AgeCell({ createdAt }: { createdAt: string }) {
  return (
    <>{formatDistanceToNow(new Date(createdAt), { locale: ru, addSuffix: false })}</>
  );
}

export default function PaymentIssuesPage() {
  const queryClient = useQueryClient();
  const [retryTarget, setRetryTarget] = useState<PaymentIssueDto | null>(null);
  const [failTarget, setFailTarget] = useState<PaymentIssueDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payment-issues'],
    queryFn: () => paymentsApi.adminIssues(),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-issues'] });
      setRetryTarget(null);
    },
  });

  const reasonForm = useForm<ReasonForm>({ resolver: zodResolver(reasonSchema) });

  const markFailedMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.markFailed(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-issues'] });
      setFailTarget(null);
      reasonForm.reset();
    },
  });

  const COLUMNS: Column<PaymentIssueDto>[] = [
    {
      key: 'orderId',
      header: 'Заказ',
      render: (row) => (
        <Link href={`/admin/orders/${row.orderId}`} className={styles.link}>
          #{row.orderId.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (row) => `${row.amount.toLocaleString('ru')} ₽`,
    },
    {
      key: 'createdAt',
      header: 'Создан',
      render: (row) => new Date(row.createdAt).toLocaleString('ru'),
    },
    {
      key: 'age',
      header: 'Возраст',
      render: (row) => <AgeCell createdAt={row.createdAt} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setRetryTarget(row); }}>
            Повторить
          </Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setFailTarget(row); }}>
            Отметить ошибкой
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>Проблемные платежи</h1>
        <span className={styles.hint}>Обновляется каждые 30 сек</span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={data?.issues ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        emptyText="Проблемных платежей нет"
      />

      <ConfirmDialog
        open={!!retryTarget}
        title="Повторить платёж?"
        description={retryTarget ? `Платёж #${retryTarget.id.slice(0, 8)} на сумму ${retryTarget.amount.toLocaleString('ru')} ₽` : ''}
        confirmLabel="Повторить"
        variant="primary"
        loading={retryMutation.isPending}
        onConfirm={() => retryTarget && retryMutation.mutate(retryTarget.id)}
        onCancel={() => setRetryTarget(null)}
      />

      <ConfirmDialog
        open={!!failTarget}
        title="Отметить как ошибочный?"
        confirmLabel="Подтвердить"
        variant="danger"
        loading={markFailedMutation.isPending}
        onConfirm={reasonForm.handleSubmit((data) =>
          failTarget && markFailedMutation.mutate({ id: failTarget.id, reason: data.reason })
        )}
        onCancel={() => { setFailTarget(null); reasonForm.reset(); }}
      >
        <div className={styles.field}>
          <label className={styles.label}>Причина *</label>
          <textarea
            className={styles.textarea}
            placeholder="Укажите причину (минимум 5 символов)"
            {...reasonForm.register('reason')}
          />
          {reasonForm.formState.errors.reason && (
            <span className={styles.error}>
              {reasonForm.formState.errors.reason.message}
            </span>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
