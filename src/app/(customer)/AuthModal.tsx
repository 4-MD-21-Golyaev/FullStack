'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button } from '@/shared/ui';
import { AuthForm, type Step } from '@/features/auth/AuthForm';
import { useAuth } from './AuthContext';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const router = useRouter();
  const { refresh, authRedirectAfter, clearAuthRedirect } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const resendTriggerRef = useRef<(() => void) | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const handleClose = () => {
    setStep('email');
    setResendSeconds(0);
    onClose();
  };

  const handleBack = step === 'code'
    ? () => setStep('email')
    : undefined;

  const footer = (() => {
    if (step === 'code') {
      return resendSeconds > 0
        ? <p className={styles.resendTimer}>Вы сможете отправить код повторно через {resendSeconds} сек.</p>
        : <Button variant="tertiary" size="lg" onClick={() => resendTriggerRef.current?.()}>Отправить код повторно</Button>;
    }
    return undefined;
  })();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Авторизация"
      onBack={handleBack}
      footer={footer}
    >
      <AuthForm
        step={step}
        onStepChange={setStep}
        onResendSecondsChange={setResendSeconds}
        resendTriggerRef={resendTriggerRef}
        onSuccess={async () => {
          await refresh();
          handleClose();
          if (authRedirectAfter) {
            router.push(authRedirectAfter);
            clearAuthRedirect();
          }
        }}
      />
    </Modal>
  );
}
