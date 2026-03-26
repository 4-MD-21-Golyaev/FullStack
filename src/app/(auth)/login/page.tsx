'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/AuthForm';
import styles from './login.module.css';

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  PICKER: '/picker',
  STAFF: '/picker',
  COURIER: '/courier',
  CUSTOMER: '/',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  function handleSuccess(role: string) {
    const home = ROLE_HOME[role] ?? '/';
    router.replace(returnTo ? decodeURIComponent(returnTo) : home);
  }

  return <AuthForm onSuccess={handleSuccess} />;
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Suspense fallback={<div style={{ height: 400 }} />}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
