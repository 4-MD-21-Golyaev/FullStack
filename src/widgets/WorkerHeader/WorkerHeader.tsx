'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useMe } from '@/lib/auth/guards';
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
      <span className={styles.logo}>Order Management</span>
      <div className={styles.right}>
        {user && <span className={styles.name}>{user.email}</span>}
        <button
          className={styles.logout}
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          title="Выйти"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </header>
  );
}
