'use client';

import { useRoleGuard } from '@/lib/auth/guards';
import { WorkerHeader } from '@/components/WorkerHeader/WorkerHeader';
import { Spinner } from '@/components/ui';
import styles from './layout.module.css';

export default function PickerLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRoleGuard(['PICKER', 'STAFF', 'ADMIN']);

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
