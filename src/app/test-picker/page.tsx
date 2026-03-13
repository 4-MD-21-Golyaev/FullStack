'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Типы ──────────────────────────────────────────────────────────────────────

type AuthStep = 'checking' | 'unauth' | 'code-sent' | 'authed';

interface Session {
    userId: string;
    email: string;
    role: string;
}

interface PickerOrder {
    id: string;
    state: string;
    totalAmount: number;
    createdAt: string;
    items?: { name: string; quantity: number }[];
}

// ── Константы ─────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<string, string> = {
    CREATED:  '#0070f3',
    PICKING:  '#e07b00',
    PAYMENT:  '#7b3fbf',
    CLOSED:   '#444',
    CANCELLED:'#c00',
};

// ── Компонент ─────────────────────────────────────────────────────────────────

export default function TestPickerPage() {

    // Аутентификация
    const [authStep, setAuthStep]       = useState<AuthStep>('checking');
    const [session, setSession]         = useState<Session | null>(null);
    const [authEmail, setAuthEmail]     = useState('');
    const [authCode, setAuthCode]       = useState('');
    const [authError, setAuthError]     = useState<string | null>(null);
    const [devCode, setDevCode]         = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);

    // Доступные заказы
    const [available, setAvailable]         = useState<PickerOrder[]>([]);
    const [availLoading, setAvailLoading]   = useState(false);
    const [availError, setAvailError]       = useState<string | null>(null);

    // Мои заказы
    const [myOrders, setMyOrders]       = useState<PickerOrder[]>([]);
    const [myLoading, setMyLoading]     = useState(false);
    const [myError, setMyError]         = useState<string | null>(null);

    // Действия
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionResult, setActionResult]   = useState<string | null>(null);
    const [actionError, setActionError]     = useState<string | null>(null);

    // ── Инициализация ─────────────────────────────────────────────────────────

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) { setSession(d); setAuthStep('authed'); } else setAuthStep('unauth'); })
            .catch(() => setAuthStep('unauth'));
    }, []);

    const loadAvailable = useCallback(async () => {
        setAvailLoading(true); setAvailError(null);
        try {
            const r = await fetch('/api/picker/orders/available');
            if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
            setAvailable(await r.json());
        } catch (e: any) { setAvailError(e.message); }
        finally { setAvailLoading(false); }
    }, []);

    const loadMyOrders = useCallback(async () => {
        setMyLoading(true); setMyError(null);
        try {
            const r = await fetch('/api/picker/orders/me');
            if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
            setMyOrders(await r.json());
        } catch (e: any) { setMyError(e.message); }
        finally { setMyLoading(false); }
    }, []);

    useEffect(() => {
        if (authStep === 'authed') {
            loadAvailable();
            loadMyOrders();
        }
    }, [authStep, loadAvailable, loadMyOrders]);

    // ── Auth handlers ─────────────────────────────────────────────────────────

    async function handleRequestCode(e: React.FormEvent) {
        e.preventDefault(); setAuthError(null); setDevCode(null); setAuthLoading(true);
        try {
            const r = await fetch('/api/auth/request-code', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail }),
            });
            const d = await r.json();
            if (d.code) setDevCode(d.code);
            setAuthStep('code-sent');
        } catch (e: any) { setAuthError(e.message); }
        finally { setAuthLoading(false); }
    }

    async function handleVerifyCode(e: React.FormEvent) {
        e.preventDefault(); setAuthError(null); setAuthLoading(true);
        try {
            const r = await fetch('/api/auth/verify-code', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, code: authCode }),
            });
            if (!r.ok) throw new Error((await r.json()).message);
            const me = await fetch('/api/auth/me').then(r2 => r2.json());
            setSession(me); setAuthStep('authed'); setDevCode(null);
        } catch (e: any) { setAuthError(e.message); }
        finally { setAuthLoading(false); }
    }

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        setSession(null); setAuthStep('unauth');
        setAvailable([]); setMyOrders([]);
        setActionResult(null); setActionError(null);
        setAuthEmail(''); setAuthCode('');
    }

    // ── Domain actions ────────────────────────────────────────────────────────

    async function doAction(orderId: string, label: string, endpoint: string) {
        setActionLoading(orderId); setActionResult(null); setActionError(null);
        try {
            const r = await fetch(endpoint, { method: 'POST' });
            const d = r.status === 204 ? { ok: true } : await r.json();
            if (!r.ok) throw new Error(d.message ?? `HTTP ${r.status}`);
            setActionResult(`[${orderId.slice(0, 8)}…] ${label}: OK`);
            await Promise.all([loadAvailable(), loadMyOrders()]);
        } catch (e: any) {
            setActionError(`[${orderId.slice(0, 8)}…] ${label}: ${e.message}`);
            await Promise.all([loadAvailable(), loadMyOrders()]);
        } finally { setActionLoading(null); }
    }

    // ── Рендер ────────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 900, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 6 }}>Picker · Тестирование</h1>
            <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 28 }}>
                <a href="/test-ops" style={{ color: '#0070f3' }}>← Хаб</a>
                {' · '}Роли: <strong>PICKER</strong>, ADMIN
                {' · '}Аккаунт: <code>picker@example.com</code>
            </p>

            {/* ── Аутентификация ── */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Аутентификация</h2>

                {authStep === 'checking' && <p style={muted}>Проверка сессии...</p>}

                {authStep === 'authed' && session && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 13 }}>
                            Вошли как <strong>{session.email}</strong>
                            {' · '}
                            <span style={{ color: roleColor(session.role), fontWeight: 700 }}>{session.role}</span>
                            {session.role !== 'PICKER' && session.role !== 'ADMIN' && (
                                <span style={{ color: '#c00', marginLeft: 12 }}>
                                    ⚠ Роль {session.role} заблокирована для picker-маршрутов
                                </span>
                            )}
                        </span>
                        <button onClick={handleLogout} style={btnSecondary}>Выйти</button>
                    </div>
                )}

                {(authStep === 'unauth' || authStep === 'code-sent') && (
                    <div>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 10 }}>
                            Picker: <code>picker@example.com</code>
                            {' · '}Admin: <code>admin@example.com</code>
                        </p>
                        {authStep === 'unauth' && (
                            <form onSubmit={handleRequestCode} style={{ display: 'flex', gap: 8 }}>
                                <input type="email" placeholder="email" value={authEmail}
                                    onChange={e => setAuthEmail(e.target.value)} required
                                    style={{ ...inputStyle, flex: 1 }} />
                                <button type="submit" disabled={authLoading} style={btnPrimary}>
                                    {authLoading ? '...' : 'Запросить код'}
                                </button>
                            </form>
                        )}
                        {authStep === 'code-sent' && (
                            <form onSubmit={handleVerifyCode} style={{ display: 'flex', gap: 8 }}>
                                <input placeholder="6-значный код" value={authCode}
                                    onChange={e => setAuthCode(e.target.value)} maxLength={6} required
                                    style={{ ...inputStyle, flex: 1 }} />
                                <button type="submit" disabled={authLoading} style={btnPrimary}>
                                    {authLoading ? '...' : 'Войти'}
                                </button>
                                <button type="button" style={btnSecondary}
                                    onClick={() => { setAuthStep('unauth'); setDevCode(null); setAuthError(null); }}>
                                    ←
                                </button>
                            </form>
                        )}
                        {devCode && <p style={devCodeBox}>[DEV] Код: <strong style={{ letterSpacing: 2 }}>{devCode}</strong></p>}
                        {authError && <p style={{ color: '#c00', fontSize: 13, marginTop: 8, marginBottom: 0 }}>{authError}</p>}
                    </div>
                )}
            </section>

            {/* ── Результат последнего действия ── */}
            {authStep === 'authed' && actionResult && (
                <div style={successBox}>{actionResult}</div>
            )}
            {authStep === 'authed' && actionError && (
                <div style={errorBox}>{actionError}</div>
            )}

            {/* ── Доступные заказы ── */}
            {authStep === 'authed' && (
                <section style={sectionStyle}>
                    <div style={sectionFlex}>
                        <h2 style={{ ...sHead, marginBottom: 0 }}>
                            Доступные заказы (CREATED)
                            {available.length > 0 && <span style={badge}>{available.length}</span>}
                        </h2>
                        <button onClick={loadAvailable} disabled={availLoading} style={btnSecondary}>
                            {availLoading ? '...' : 'Обновить'}
                        </button>
                    </div>
                    {availError && <p style={errInline}>{availError}</p>}
                    {availLoading && <p style={muted}>Загрузка...</p>}
                    {!availLoading && available.length === 0 && !availError && (
                        <p style={{ ...muted, marginBottom: 0 }}>Нет доступных заказов</p>
                    )}
                    {!availLoading && available.length > 0 && (
                        <OrderTable
                            orders={available}
                            actionLoading={actionLoading}
                            actions={(o) => [
                                {
                                    label: 'Claim',
                                    style: btnPrimary,
                                    onClick: () => doAction(o.id, 'claim', `/api/picker/orders/${o.id}/claim`),
                                },
                            ]}
                        />
                    )}
                </section>
            )}

            {/* ── Мои заказы ── */}
            {authStep === 'authed' && (
                <section style={sectionStyle}>
                    <div style={sectionFlex}>
                        <h2 style={{ ...sHead, marginBottom: 0 }}>
                            Мои заказы
                            {myOrders.length > 0 && <span style={badge}>{myOrders.length}</span>}
                        </h2>
                        <button onClick={loadMyOrders} disabled={myLoading} style={btnSecondary}>
                            {myLoading ? '...' : 'Обновить'}
                        </button>
                    </div>
                    {myError && <p style={errInline}>{myError}</p>}
                    {myLoading && <p style={muted}>Загрузка...</p>}
                    {!myLoading && myOrders.length === 0 && !myError && (
                        <p style={{ ...muted, marginBottom: 0 }}>Нет назначенных заказов</p>
                    )}
                    {!myLoading && myOrders.length > 0 && (
                        <OrderTable
                            orders={myOrders}
                            actionLoading={actionLoading}
                            actions={(o) => [
                                {
                                    label: 'Release',
                                    style: btnSecondary,
                                    onClick: () => doAction(o.id, 'release', `/api/picker/orders/${o.id}/release`),
                                },
                                ...(o.state === 'CREATED' ? [{
                                    label: 'Start Picking',
                                    style: btnSuccess,
                                    onClick: () => doAction(o.id, 'start-picking', `/api/orders/${o.id}/start-picking`),
                                }] : []),
                                ...(o.state === 'PICKING' ? [{
                                    label: 'Complete Picking',
                                    style: btnSuccess,
                                    onClick: () => doAction(o.id, 'complete-picking', `/api/orders/${o.id}/complete-picking`),
                                }] : []),
                            ]}
                        />
                    )}
                </section>
            )}

            {/* ── Сценарии ── */}
            {authStep === 'authed' && (
                <section style={{ ...sectionStyle, background: '#f0fff8', borderColor: '#b7ebc5' }}>
                    <h2 style={sHead}>Сценарии для проверки</h2>
                    <ol style={{ fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                        <li>PICKER берёт заказ из «Доступные» — нажать <strong>Claim</strong></li>
                        <li>Повторный Claim тем же PICKER — идемпотентен (OK, не ошибка)</li>
                        <li>Конкурентный Claim другим пользователем — ожидается <code>409 already claimed</code></li>
                        <li>Claim вне CREATED/PICKING — ожидается ошибка перехода состояния</li>
                        <li>Нецелевые роли (CUSTOMER, COURIER) — <code>403 Forbidden</code>
                            {' '}(проверить в <a href="/test-access-matrix" style={{ color: '#0070f3' }}>матрице доступа</a>)</li>
                    </ol>
                </section>
            )}
        </div>
    );
}

// ── Подкомпонент таблицы заказов ──────────────────────────────────────────────

interface OrderAction {
    label: string;
    style: React.CSSProperties;
    onClick: () => void;
}

function OrderTable({ orders, actions, actionLoading }: {
    orders: PickerOrder[];
    actions: (o: PickerOrder) => OrderAction[];
    actionLoading: string | null;
}) {
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={th}>ID</th>
                    <th style={th}>Статус</th>
                    <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                    <th style={{ ...th, textAlign: 'right' }}>Дата</th>
                    <th style={th}>Действия</th>
                </tr>
            </thead>
            <tbody>
                {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '7px 8px 7px 0', color: '#666', fontSize: 11 }}>
                            {o.id.slice(0, 8)}…
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                            <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: STATE_COLOR[o.state] ?? '#333',
                                background: '#f5f5f5', borderRadius: 3, padding: '2px 5px',
                            }}>
                                {o.state}
                            </span>
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {o.totalAmount.toLocaleString('ru')} ₽
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {new Date(o.createdAt).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </td>
                        <td style={{ padding: '7px 0' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {actions(o).map(a => (
                                    <button key={a.label} onClick={a.onClick} disabled={actionLoading === o.id}
                                        style={{ ...a.style, padding: '4px 10px', fontSize: 11 }}>
                                        {actionLoading === o.id ? '...' : a.label}
                                    </button>
                                ))}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Вспомогательные функции ────────────────────────────────────────────────────

function roleColor(role: string) {
    if (role === 'ADMIN')   return '#c00';
    if (role === 'PICKER')  return '#e07b00';
    if (role === 'COURIER') return '#7b3fbf';
    return '#0a9e5c';
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    marginBottom: 28, padding: 16, background: '#f8f8f8', borderRadius: 6, border: '1px solid #ddd',
};
const sectionFlex: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 };
const sHead: React.CSSProperties = { fontSize: 15, marginBottom: 12, marginTop: 0 };
const muted: React.CSSProperties = { color: '#888', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '4px 8px 8px 0', fontWeight: 600, color: '#444', fontSize: 12 };
const badge: React.CSSProperties = { marginLeft: 8, fontSize: 12, color: '#888', fontWeight: 400 };
const errInline: React.CSSProperties = { color: '#c00', fontSize: 13, margin: '0 0 10px' };
const devCodeBox: React.CSSProperties = {
    fontSize: 13, background: '#fffbe6', border: '1px solid #f0c040',
    borderRadius: 4, padding: '6px 10px', marginTop: 8, marginBottom: 0,
};
const successBox: React.CSSProperties = {
    fontSize: 13, color: '#0a9e5c', background: '#f0fff4', border: '1px solid #b7ebc5',
    borderRadius: 4, padding: '8px 12px', marginBottom: 20,
};
const errorBox: React.CSSProperties = {
    fontSize: 13, color: '#c00', background: '#fee', border: '1px solid #fcc',
    borderRadius: 4, padding: '8px 12px', marginBottom: 20,
};
const inputStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 14, fontFamily: 'monospace',
    border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#0070f3',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSuccess: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#0a9e5c',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, background: '#f0f0f0',
    color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
};
