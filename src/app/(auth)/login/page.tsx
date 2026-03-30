'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, type Step } from '@/features/auth/AuthForm';
import { IconButton } from '@/shared/ui';
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
  const [step, setStep] = useState<Step>('email');

  function handleSuccess(role: string) {
    const home = ROLE_HOME[role] ?? '/';
    router.replace(returnTo ? decodeURIComponent(returnTo) : home);
  }

  return (
    <>
      {step !== 'email' && (
        <IconButton
          icon="arrow_left"
          variant="white"
          size="md"
          onClick={() => setStep(step === 'register' ? 'code' : 'email')}
          aria-label="Назад"
          className={styles.backBtn}
        />
      )}
      <AuthForm step={step} onStepChange={setStep} onSuccess={handleSuccess} />
    </>
  );
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
