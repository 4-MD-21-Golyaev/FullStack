'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useMe } from '@/lib/auth/guards';
import { Button } from '@/shared/ui';
import styles from './WorkerHeader.module.css';

export function WorkerHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useMe();

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  return (
    <header className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Управление заказами</span>
        {user && (
          <span className={styles.roleBadge}>{user.role}</span>
        )}
      </div>
      <div className={styles.right}>
        {user && <span className={styles.email}>{user.email}</span>}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          title="Выйти"
        >
          <LogOut size={16} />
          <span className={styles.logoutText}>Выйти</span>
        </Button>
      </div>
    </header>
  );
}
