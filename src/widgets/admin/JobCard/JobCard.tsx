'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, type JobName, type JobStatusResponse } from '@/lib/api/jobs';
import { Button } from '@/shared/ui';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import styles from './JobCard.module.css';

interface JobCardProps {
  jobName: JobName;
  label: string;
  description: string;
  status: JobStatusResponse | undefined;
}

export function JobCard({ jobName, label, description, status }: JobCardProps) {
  const queryClient = useQueryClient();

  const runMutation = useMutation({
    mutationFn: () => jobsApi.run(jobName),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'jobs', jobName, 'status'], data);
    },
  });

  const isRunning = status?.status === 'RUNNING' || runMutation.isPending;

  const statusClass =
    status?.status === 'SUCCESS'
      ? styles.statusSuccess
      : status?.status === 'FAILED'
        ? styles.statusFailed
        : status?.status === 'RUNNING'
          ? styles.statusRunning
          : styles.statusUnknown;

  return (
    <div className={styles.jobCard}>
      <div className={styles.jobHeader}>
        <div>
          <h3 className={styles.jobName}>{label}</h3>
          <p className={styles.jobDesc}>{description}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={isRunning}
          disabled={isRunning}
          onClick={() => runMutation.mutate()}
        >
          Запустить
        </Button>
      </div>

      {status && (
        <div className={styles.jobMeta}>
          <span className={`${styles.jobStatus} ${statusClass}`}>
            {status.status ?? '—'}
          </span>
          {status.startedAt && (
            <span className={styles.jobTime}>
              Запущен{' '}
              {formatDistanceToNow(new Date(status.startedAt), {
                locale: ru,
                addSuffix: true,
              })}
            </span>
          )}
          {status.processed !== null && (
            <span className={styles.jobStat}>
              Обработано: <strong>{status.processed}</strong>
            </span>
          )}
          {status.failed !== null && status.failed > 0 && (
            <span className={styles.jobStat}>
              Ошибок: <strong className={styles.statusFailed}>{status.failed}</strong>
            </span>
          )}
          {status.durationMs !== null && (
            <span className={styles.jobStat}>
              Время: <strong>{(status.durationMs / 1000).toFixed(1)}с</strong>
            </span>
          )}
          {status.errorSummary && (
            <span className={styles.jobError}>{status.errorSummary}</span>
          )}
        </div>
      )}
    </div>
  );
}
