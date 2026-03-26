'use client';

import { useQueries } from '@tanstack/react-query';
import { jobsApi, type JobName } from '@/lib/api/jobs';
import { JobCard } from '@/widgets/admin/JobCard/JobCard';
import styles from './page.module.css';

const JOBS: { name: JobName; label: string; description: string }[] = [
  {
    name: 'payment-timeout',
    label: 'Таймаут платежей',
    description: 'Отменяет заказы в PAYMENT с истёкшим 10-минутным таймаутом',
  },
  {
    name: 'process-outbox',
    label: 'Обработка Outbox',
    description: 'Отправляет события заказов в МойСклад',
  },
  {
    name: 'sync-products',
    label: 'Синхронизация товаров',
    description: 'Загружает актуальный каталог из МойСклад',
  },
];

export default function AdminJobsPage() {
  const queries = useQueries({
    queries: JOBS.map((j) => ({
      queryKey: ['admin', 'jobs', j.name, 'status'],
      queryFn: () => jobsApi.getStatus(j.name),
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  });

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Фоновые задачи</h1>
      <div className={styles.grid}>
        {JOBS.map((job, i) => (
          <JobCard
            key={job.name}
            jobName={job.name}
            label={job.label}
            description={job.description}
            status={queries[i].data}
          />
        ))}
      </div>
    </div>
  );
}
