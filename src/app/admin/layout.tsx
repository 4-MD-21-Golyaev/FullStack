'use client';

import { useRoleGuard } from '@/lib/auth/guards';
import { AdminSidebar } from '@/widgets/admin/AdminSidebar/AdminSidebar';
import { AdminHeader } from '@/widgets/admin/AdminHeader/AdminHeader';
import { Spinner } from '@/shared/ui';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRoleGuard(['ADMIN']);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Загрузка..." />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <AdminSidebar />
      <div className={styles.main}>
        <AdminHeader />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
