'use client';
import React from 'react';
import { useRoleGuard } from '@/lib/auth/guards';
import { WorkerHeader } from '@/widgets/WorkerHeader/WorkerHeader';
import { Spinner } from '@/shared/ui';
import styles from './WorkerLayout.module.css';

interface WorkerLayoutProps {
  roles: string[];
  children: React.ReactNode;
}

export function WorkerLayout({ roles, children }: WorkerLayoutProps) {
  const { isLoading } = useRoleGuard(roles);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Загрузка..." />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <WorkerHeader />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
