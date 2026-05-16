'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm, type Step } from '@/features/auth/AuthForm';
import { IconButton, Button } from '@/shared/ui';
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
  const resendTriggerRef = useRef<(() => void) | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  function handleSuccess(role: string) {
    const home = ROLE_HOME[role] ?? '/';
    router.replace(returnTo ? decodeURIComponent(returnTo) : home);
  }

  const footer = (() => {
    if (step === 'code') {
      return resendSeconds > 0
        ? <p className={styles.resendTimer}>Вы сможете отправить код повторно через {resendSeconds} сек.</p>
        : <Button variant="tertiary" size="lg" onClick={() => resendTriggerRef.current?.()}>Отправить код повторно</Button>;
    }
    return undefined;
  })();

  return (
    <>
      <div className={styles.header}>
        <span className={styles.headerSlot}>
          {step === 'code'
            ? <IconButton icon="arrow_left" variant="white" size="md" onClick={() => setStep('email')} aria-label="Назад" />
            : <span style={{ width: 40, height: 40, visibility: 'hidden' }} />
          }
        </span>
        <span className={styles.headerTitle}>Авторизация</span>
        <span className={styles.headerSlot}>
          <span style={{ width: 40, height: 40, visibility: 'hidden' }} />
        </span>
      </div>
      <div className={styles.content}>
        <AuthForm
          step={step}
          onStepChange={setStep}
          onResendSecondsChange={setResendSeconds}
          resendTriggerRef={resendTriggerRef}
          onSuccess={handleSuccess}
        />
      </div>
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
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
