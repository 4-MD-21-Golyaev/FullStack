'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { IconButton, Button, Input, Spinner } from '@/shared/ui';
import styles from './AuthForm.module.css';

// ── OTP 4-box input ───────────────────────────────────────────────────────────

interface CodeInputProps {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  autoFocus?: boolean;
}

function CodeInput({ value, onChange, hasError, autoFocus }: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  const chars = Array.from({ length: 4 }, (_, i) => value[i] ?? '');

  function setChar(index: number, digit: string) {
    const next = [...chars];
    next[index] = digit;
    onChange(next.join('').replace(/\s+$/, '').slice(0, 4));
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const newChar = e.target.value.replace(/\D/g, '').slice(-1);
    setChar(index, newChar);
    if (newChar && index < 3) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (chars[index]) {
        setChar(index, '');
      } else if (index > 0) {
        setChar(index - 1, '');
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(digits);
    inputRefs.current[Math.min(digits.length, 3)]?.focus();
  }

  return (
    <div className={styles.codeBoxes}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          className={`${styles.codeBox} ${hasError ? styles.codeBoxError : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={chars[i]}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Цифра ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ── AuthForm ──────────────────────────────────────────────────────────────────

type Step = 'email' | 'code' | 'register';

const RESEND_TIMEOUT_SEC = 60;

export interface AuthFormProps {
  /** Called after successful authentication. Can be async (e.g. refresh user state). */
  onSuccess: (role: string) => void | Promise<void>;
  /** If provided, shows an × close button in the header. */
  onClose?: () => void;
}

export function AuthForm({ onSuccess, onClose }: AuthFormProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSeconds]);

  async function sendCode(targetEmail: string): Promise<string | null> {
    const res = await fetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json() as { ok?: boolean; code?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? 'Ошибка запроса кода');
    return data.code ?? null;
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newDevCode = await sendCode(email);
      setDevCode(newDevCode);
      setCode('');
      setResendSeconds(RESEND_TIMEOUT_SEC);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(codeValue: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeValue }),
      });
      if (res.ok) {
        const { role } = await res.json() as { ok: boolean; role: string };
        await onSuccess(role);
        return;
      }
      const data = await res.json() as { message?: string };
      if (res.status === 404) {
        setStep('register');
        return;
      }
      if (res.status === 429) {
        setError('Слишком много попыток. Запросите новый код.');
        return;
      }
      setError(data.message ?? 'Неверный код');
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    setError(null);
    if (newCode.length === 4 && !loading) {
      handleVerifyCode(newCode);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError(null);
    setCode('');
    try {
      const newDevCode = await sendCode(email);
      setDevCode(newDevCode);
      setResendSeconds(RESEND_TIMEOUT_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, address: address || null }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? 'Ошибка регистрации');
        return;
      }
      const newDevCode = await sendCode(email);
      setDevCode(newDevCode);
      setCode('');
      setResendSeconds(RESEND_TIMEOUT_SEC);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  const hasCodeError = !!error && step === 'code';

  return (
    <div className={styles.dialog}>
      {/* ── Header ── */}
      <div className={styles.header}>
        {step !== 'email' && (
          <IconButton
            icon="arrow_left"
            variant="white"
            size="md"
            className={styles.backBtn}
            aria-label="Назад"
            onClick={() => { setStep(step === 'code' ? 'email' : 'code'); setError(null); }}
          />
        )}
        <p className={styles.title}>Авторизация</p>
        {onClose && (
          <IconButton
            icon="cross"
            variant="white"
            size="md"
            className={styles.closeBtn}
            aria-label="Закрыть"
            onClick={onClose}
          />
        )}
      </div>

      {/* ── Step: email ── */}
      {step === 'email' && (
        <form className={styles.body} onSubmit={handleRequestCode}>
          <div className={styles.content}>
            <p className={styles.subtitle}>
              Введите email для получения кода подтверждения
            </p>
            <div className={styles.form}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                size="lg"
              />
              {error && <p className={styles.errorMsg}>{error}</p>}
              <Button type="submit" variant="primary" size="lg" loading={loading}>
                Получить код
              </Button>
            </div>
          </div>
          <footer className={styles.footer}>
            <p className={styles.footerText}>
              Продолжая авторизацию, вы даете{' '}
              <span className={styles.footerLink}>согласие на обработку персональных данных</span>
            </p>
          </footer>
        </form>
      )}

      {/* ── Step: code ── */}
      {step === 'code' && (
        <div className={styles.body}>
          <div className={styles.content}>
            <p className={styles.subtitle}>
              На адрес{' '}
              <span className={styles.subtitleHighlight}>{email}</span>{' '}
              выслан код подтверждения
            </p>
            <CodeInput
              value={code}
              onChange={handleCodeChange}
              hasError={hasCodeError}
              autoFocus
            />
            {loading && resendSeconds > 0 && <Spinner size="sm" />}
            {hasCodeError && <p className={styles.errorMsg}>{error}</p>}
            {devCode && (
              <p className={styles.devCode}>[DEV] Код: <strong>{devCode}</strong></p>
            )}
          </div>
          <footer className={styles.footer}>
            {resendSeconds > 0 ? (
              <p className={styles.footerText}>
                Вы сможете отправить код повторно через {resendSeconds} сек.
              </p>
            ) : (
              <Button
                type="button"
                variant="tertiary"
                size="lg"
                loading={loading}
                onClick={handleResend}
              >
                Отправить код повторно
              </Button>
            )}
          </footer>
        </div>
      )}

      {/* ── Step: register ── */}
      {step === 'register' && (
        <form className={styles.body} onSubmit={handleRegister}>
          <div className={styles.content}>
            <p className={styles.subtitle}>
              Аккаунт не найден. Создайте его, чтобы продолжить.
            </p>
            <div className={styles.form}>
              <Input
                type="tel"
                placeholder="Телефон"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                autoFocus
                size="lg"
              />
              <Input
                placeholder="Адрес доставки"
                value={address}
                onChange={e => setAddress(e.target.value)}
                size="lg"
              />
              {error && <p className={styles.errorMsg}>{error}</p>}
              <Button type="submit" variant="primary" size="lg" loading={loading}>
                Зарегистрироваться
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
