'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui';
import styles from './login.module.css';

const emailSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

const codeSchema = z.object({
  code: z.string().min(4, 'Введите код из письма'),
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  PICKER: '/picker',
  STAFF: '/picker',
  COURIER: '/courier',
  CUSTOMER: '/',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });

  const requestCodeMutation = useMutation({
    mutationFn: (data: EmailForm) => authApi.requestCode(data.email),
    onSuccess: (_, variables) => {
      setEmail(variables.email);
      setStep('code');
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: (data: CodeForm) => authApi.verifyCode(email, data.code),
    onSuccess: (data) => {
      const home = ROLE_HOME[data.role] ?? '/';
      const destination = returnTo ? decodeURIComponent(returnTo) : home;
      router.replace(destination);
    },
  });

  if (step === 'email') {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Вход в систему</h1>
        <p className={styles.subtitle}>Введите email — мы отправим код подтверждения</p>

        <form
          className={styles.form}
          onSubmit={emailForm.handleSubmit((data) => requestCodeMutation.mutate(data))}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <span className={styles.error}>
                {emailForm.formState.errors.email.message}
              </span>
            )}
          </div>

          {requestCodeMutation.error && (
            <div className={styles.errorBanner}>
              {(requestCodeMutation.error as Error).message}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={requestCodeMutation.isPending}
          >
            Получить код
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Введите код</h1>
      <p className={styles.subtitle}>
        Код отправлен на <strong>{email}</strong>
      </p>

      <form
        className={styles.form}
        onSubmit={codeForm.handleSubmit((data) => verifyCodeMutation.mutate(data))}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="code">Код подтверждения</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={styles.input}
            placeholder="123456"
            {...codeForm.register('code')}
          />
          {codeForm.formState.errors.code && (
            <span className={styles.error}>
              {codeForm.formState.errors.code.message}
            </span>
          )}
        </div>

        {verifyCodeMutation.error && (
          <div className={styles.errorBanner}>
            {(verifyCodeMutation.error as Error).message}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={verifyCodeMutation.isPending}
        >
          Войти
        </Button>

        <button
          type="button"
          className={styles.back}
          onClick={() => setStep('email')}
        >
          ← Изменить email
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={<div className={styles.card} />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
