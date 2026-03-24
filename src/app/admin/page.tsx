'use client';

import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { Package, CreditCard, Settings } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import { jobsApi, type JobName } from '@/lib/api/jobs';
import { StatCard, OrderStatusBadge } from '@/shared/ui';
import { OrderState } from '@/domain/order/OrderState';
import styles from './page.module.css';

const JOB_NAMES: JobName[] = ['payment-timeout', 'process-outbox', 'sync-products'];

const JOB_LABELS: Record<JobName, string> = {
  'payment-timeout': 'Таймаут платежей',
  'process-outbox': 'Обработка Outbox',
  'sync-products': 'Синхронизация товаров',
};

const KPI_STATES = [
  OrderState.CREATED,
  OrderState.PICKING,
  OrderState.PAYMENT,
  OrderState.DELIVERY_ASSIGNED,
];

export default function AdminDashboard() {
  const orderQueries = useQueries({
    queries: KPI_STATES.map((state) => ({
      queryKey: ['admin', 'orders', 'count', state],
      queryFn: () => ordersApi.adminList({ status: state, limit: 1 }),
      staleTime: 60_000,
    })),
  });

  const paymentIssuesQuery = useQueries({
    queries: [{
      queryKey: ['admin', 'payment-issues'],
      queryFn: () => paymentsApi.adminIssues(),
      staleTime: 30_000,
    }],
  })[0];

  const jobQueries = useQueries({
    queries: JOB_NAMES.map((name) => ({
      queryKey: ['admin', 'jobs', name, 'status'],
      queryFn: () => jobsApi.getStatus(name),
      staleTime: 30_000,
    })),
  });

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Dashboard</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Заказы по статусам</h2>
        <div className={styles.kpiGrid}>
          {KPI_STATES.map((state, i) => (
            <StatCard
              key={state}
              label={<OrderStatusBadge state={state} /> as unknown as string}
              value={orderQueries[i].data?.total ?? '—'}
              icon={<Package size={16} />}
              loading={orderQueries[i].isLoading}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Проблемные платежи{' '}
          <Link href="/admin/payments/issues" className={styles.link}>
            Смотреть все →
          </Link>
        </h2>
        <StatCard
          label="Проблемных платежей"
          value={paymentIssuesQuery.data?.total ?? '—'}
          icon={<CreditCard size={16} />}
          loading={paymentIssuesQuery.isLoading}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Фоновые задачи{' '}
          <Link href="/admin/jobs" className={styles.link}>
            Управление →
          </Link>
        </h2>
        <div className={styles.jobsStrip}>
          {JOB_NAMES.map((name, i) => {
            const job = jobQueries[i].data;
            const statusClass =
              job?.status === 'SUCCESS'
                ? styles.jobSuccess
                : job?.status === 'FAILED'
                  ? styles.jobFailed
                  : job?.status === 'RUNNING'
                    ? styles.jobRunning
                    : styles.jobUnknown;

            return (
              <div key={name} className={styles.jobCard}>
                <Settings size={14} className={statusClass} />
                <span className={styles.jobName}>{JOB_LABELS[name]}</span>
                <span className={`${styles.jobStatus} ${statusClass}`}>
                  {job?.status ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
