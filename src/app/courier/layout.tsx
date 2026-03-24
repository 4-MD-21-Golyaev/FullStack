'use client';

import { useRoleGuard } from '@/lib/auth/guards';
import { WorkerHeader } from '@/widgets/WorkerHeader/WorkerHeader';
import { Spinner } from '@/shared/ui';
import styles from './layout.module.css';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRoleGuard(['COURIER', 'ADMIN']);

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
