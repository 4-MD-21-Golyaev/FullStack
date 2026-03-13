'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useMe } from '@/lib/auth/guards';
import styles from './AdminHeader.module.css';

export function AdminHeader() {
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
      <div className={styles.spacer} />
      <div className={styles.right}>
        {user && (
          <span className={styles.user}>
            {user.email} <span className={styles.role}>({user.role})</span>
          </span>
        )}
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
