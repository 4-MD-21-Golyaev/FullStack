'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import bridge from '@vkontakte/vk-bridge';
import { Spinner, IconButton } from '@/shared/ui';
import { AuthForm, type Step } from '@/features/auth/AuthForm';
import styles from './vk.module.css';

type State =
    | { status: 'loading' }
    | { status: 'link' }
    | { status: 'error'; message: string };

const ROLE_REDIRECT: Record<string, string> = {
    ADMIN:   '/admin',
    PICKER:  '/picker',
    STAFF:   '/picker',
    COURIER: '/courier',
};

const AUTH_ERROR: Record<number, string> = {
    401: 'Не удалось войти. Попробуйте закрыть и открыть приложение заново.',
    404: 'Аккаунт не найден. Обратитесь к администратору.',
    503: 'Сервис временно недоступен.',
};

async function redirectByRole(router: ReturnType<typeof useRouter>): Promise<string | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return 'Не удалось определить роль пользователя.';
    const me = await res.json();
    const redirect = ROLE_REDIRECT[me.role];
    if (!redirect) return 'У вас нет доступа к рабочей панели.';
    router.replace(redirect);
    return null;
}

export default function VkEntryPage({ initialQueryString }: { initialQueryString: string }) {
    const router = useRouter();
    const queryStringRef = useRef(initialQueryString);
    const [state, setState] = useState<State>({ status: 'loading' });
    const [step, setStep] = useState<Step>('email');

    useEffect(() => {
        bridge.send('VKWebAppInit');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }, []);

    // Eruda — мобильная консоль для отладки в VK Mini App
    useEffect(() => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/eruda';
        s.onload = () => (window as unknown as { eruda: { init(): void } }).eruda.init();
        document.head.appendChild(s);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                // initialQueryString захвачен на сервере до того, как VK mobile
                // успевает вычистить query string через history.replaceState.
                // Если пуст — пробуем VK Bridge как запасной вариант.
                let queryString = initialQueryString;

                if (!queryString) {
                    const raw = await bridge.send('VKWebAppGetLaunchParams') as Record<string, unknown>;
                    const sign = raw.sign as string | undefined;
                    if (!sign) {
                        setState({ status: 'error', message: 'Не удалось получить данные от VK.' });
                        return;
                    }
                    const vkEntries = Object.entries(raw)
                        .filter(([key]) => key.startsWith('vk_'))
                        .sort(([a], [b]) => a.localeCompare(b));
                    queryString = [
                        ...vkEntries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`),
                        `sign=${encodeURIComponent(sign)}`,
                    ].join('&');
                }

                queryStringRef.current = queryString;

                const res = await fetch('/api/auth/vk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queryString }),
                });

                if (res.status === 403) {
                    // VK-аккаунт не привязан — показываем форму привязки
                    setState({ status: 'link' });
                    return;
                }

                if (!res.ok) {
                    const data = await res.json().catch(() => ({})) as { message?: string };
                    const message = AUTH_ERROR[res.status] ?? data.message ?? 'Произошла ошибка.';
                    setState({ status: 'error', message });
                    return;
                }

                const error = await redirectByRole(router);
                if (error) setState({ status: 'error', message: error });
            } catch (e) {
                console.log('[vk] exception:', e);
                setState({ status: 'error', message: 'Ошибка соединения. Попробуйте снова.' });
            }
        })();
    }, [router, initialQueryString]);

    // Вызывается AuthForm после успешного OTP — нужно ещё привязать VK-аккаунт
    async function handleAuthSuccess() {
        const linkRes = await fetch('/api/auth/vk/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryString: queryStringRef.current }),
        });
        if (!linkRes.ok) {
            const data = await linkRes.json().catch(() => ({})) as { message?: string };
            setState({ status: 'error', message: data.message ?? 'Не удалось привязать VK-аккаунт.' });
            return;
        }
        const error = await redirectByRole(router);
        if (error) setState({ status: 'error', message: error });
    }

    if (state.status === 'loading') {
        return (
            <div className={styles.page}>
                <Spinner size="lg" label="Авторизация..." />
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Ошибка входа</h1>
                    <p className={styles.message}>{state.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.formCard} style={{ position: 'relative' }}>
                {step !== 'email' && (
                    <IconButton
                        icon="arrow_left"
                        variant="white"
                        size="md"
                        onClick={() => setStep(step === 'register' ? 'code' : 'email')}
                        aria-label="Назад"
                        style={{ position: 'absolute', top: 24, left: 24 }}
                    />
                )}
                <AuthForm step={step} onStepChange={setStep} onSuccess={handleAuthSuccess} />
            </div>
        </div>
    );
}
