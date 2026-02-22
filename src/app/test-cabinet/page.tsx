'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Типы ────────────────────────────────────────────────────────────────────

interface Session {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}

interface OrderItem {
    productId: string;
    name: string;
    article: string;
    price: number;
    quantity: number;
}

interface Order {
    id: string;
    userId: string;
    state: string;
    totalAmount: number;
    address: string;
    absenceResolutionStrategy: string;
    items: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

// ── Константы ────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<string, string> = {
    CREATED:   '#0070f3',
    PICKING:   '#e07b00',
    PAYMENT:   '#7b3fbf',
    DELIVERY:  '#0a9e5c',
    CLOSED:    '#444',
    CANCELLED: '#c00',
};

const CANCELLABLE = new Set(['CREATED', 'PICKING', 'PAYMENT']);

// ── Компонент ────────────────────────────────────────────────────────────────

type AuthStep = 'checking' | 'unauthenticated' | 'code-sent' | 'authenticated';

export default function TestCabinetPage() {

    // Аутентификация
    const [authStep, setAuthStep]       = useState<AuthStep>('checking');
    const [session, setSession]         = useState<Session | null>(null);
    const [authEmail, setAuthEmail]     = useState('');
    const [authCode, setAuthCode]       = useState('');
    const [authError, setAuthError]     = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [devCode, setDevCode]         = useState<string | null>(null);

    // Список заказов
    const [orders, setOrders]             = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError]   = useState<string | null>(null);

    // Детальный просмотр
    const [selectedOrder, setSelectedOrder]       = useState<Order | null>(null);
    const [detailLoading, setDetailLoading]       = useState(false);
    const [detailError, setDetailError]           = useState<string | null>(null);

    // Справочники
    const [stateLabels, setStateLabels]       = useState<Record<string, string>>({});
    const [absenceLabels, setAbsenceLabels]   = useState<Record<string, string>>({});

    // Действия над заказом
    const [actionLoading, setActionLoading]   = useState(false);
    const [actionResult, setActionResult]     = useState<string | null>(null);
    const [actionError, setActionError]       = useState<string | null>(null);

    // ── Инициализация ─────────────────────────────────────────────────────────

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) { setSession(data); setAuthStep('authenticated'); }
                else       { setAuthStep('unauthenticated'); }
            })
            .catch(() => setAuthStep('unauthenticated'));
    }, []);

    useEffect(() => {
        fetch('/api/order-statuses')
            .then(r => r.json())
            .then((data: { code: string; name: string }[]) =>
                setStateLabels(Object.fromEntries(data.map(s => [s.code, s.name])))
            )
            .catch(() => {});
        fetch('/api/absence-resolution-strategies')
            .then(r => r.json())
            .then((data: { code: string; name: string }[]) =>
                setAbsenceLabels(Object.fromEntries(data.map(s => [s.code, s.name])))
            )
            .catch(() => {});
    }, []);

    // ── Auth handlers ─────────────────────────────────────────────────────────

    async function handleRequestCode(e: React.FormEvent) {
        e.preventDefault();
        setAuthError(null); setDevCode(null); setAuthLoading(true);
        try {
            const res = await fetch('/api/auth/request-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail }),
            });
            const data = await res.json();
            if (data.code) setDevCode(data.code);
            setAuthStep('code-sent');
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    }

    async function handleVerifyCode(e: React.FormEvent) {
        e.preventDefault();
        setAuthError(null); setAuthLoading(true);
        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, code: authCode }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            const me = await fetch('/api/auth/me').then(r => r.json());
            setSession(me); setAuthStep('authenticated'); setDevCode(null);
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    }

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        setSession(null); setAuthStep('unauthenticated');
        setAuthEmail(''); setAuthCode('');
        setOrders([]); setSelectedOrder(null);
        setActionResult(null); setActionError(null);
    }

    // ── Список заказов ────────────────────────────────────────────────────────

    const loadOrders = useCallback(async () => {
        setOrdersLoading(true); setOrdersError(null);
        try {
            const res = await fetch('/api/orders');
            if (!res.ok) throw new Error((await res.json()).message);
            setOrders(await res.json());
        } catch (err: any) {
            setOrdersError(err.message);
        } finally {
            setOrdersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authStep === 'authenticated') loadOrders();
    }, [authStep, loadOrders]);

    // ── Детальный просмотр ────────────────────────────────────────────────────

    async function handleSelectOrder(id: string) {
        if (selectedOrder?.id === id) { setSelectedOrder(null); return; }
        setDetailLoading(true); setDetailError(null); setActionResult(null); setActionError(null);
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (!res.ok) throw new Error((await res.json()).message);
            setSelectedOrder(await res.json());
        } catch (err: any) {
            setDetailError(err.message);
        } finally {
            setDetailLoading(false);
        }
    }

    // ── Отмена заказа ─────────────────────────────────────────────────────────

    async function handleCancel(orderId: string) {
        setActionLoading(true); setActionResult(null); setActionError(null);
        try {
            const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setActionResult('Заказ отменён');
            // Обновляем детальный вид и список
            setSelectedOrder(data);
            setOrders(prev => prev.map(o => o.id === orderId ? data : o));
        } catch (err: any) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    // ── Повтор заказа (добавить позиции в корзину) ────────────────────────────

    async function handleRepeat(orderId: string) {
        setActionLoading(true); setActionResult(null); setActionError(null);
        try {
            const res = await fetch(`/api/orders/${orderId}/repeat`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setActionResult(`${data.addedCount} ${plural(data.addedCount, 'позиция добавлена', 'позиции добавлены', 'позиций добавлено')} в корзину`);
        } catch (err: any) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    // ── Рендер ────────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 820, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 6 }}>Личный кабинет</h1>
            <p style={{ color: '#888', fontSize: 12, marginBottom: 28, marginTop: 0 }}>
                Тестовая страница · <a href="/test-order" style={{ color: '#0070f3' }}>← Тестирование заказа</a>
            </p>

            {/* ── Аутентификация ── */}
            <section style={sectionStyle}>
                <h2 style={sectionHead}>Аутентификация</h2>

                {authStep === 'checking' && <p style={muted}>Проверка сессии...</p>}

                {authStep === 'authenticated' && session && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>
                            Вошли как <strong>{session.email}</strong>
                            {' · '}
                            <span style={{ color: roleColor(session.role) }}>{session.role}</span>
                        </span>
                        <button onClick={handleLogout} style={btnSecondary}>Выйти</button>
                    </div>
                )}

                {(authStep === 'unauthenticated' || authStep === 'code-sent') && (
                    <div>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 10 }}>
                            Тестовые аккаунты: <code>test@example.com</code> (CUSTOMER) ·{' '}
                            <code>staff@example.com</code> (STAFF) · <code>admin@example.com</code> (ADMIN)
                        </p>

                        {authStep === 'unauthenticated' && (
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
                                    onClick={() => { setAuthStep('unauthenticated'); setDevCode(null); setAuthError(null); }}>
                                    ←
                                </button>
                            </form>
                        )}

                        {devCode && (
                            <p style={{ fontSize: 13, background: '#fffbe6', border: '1px solid #f0c040', borderRadius: 4, padding: '6px 10px', marginTop: 8, marginBottom: 0 }}>
                                [DEV] Код: <strong style={{ letterSpacing: 2 }}>{devCode}</strong>
                            </p>
                        )}

                        {authError && <p style={{ color: '#c00', fontSize: 13, marginTop: 8, marginBottom: 0 }}>{authError}</p>}
                    </div>
                )}
            </section>

            {/* ── История заказов ── */}
            {authStep === 'authenticated' && (
                <section style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ ...sectionHead, marginBottom: 0 }}>
                            История заказов
                            {orders.length > 0 && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#888', fontWeight: 400 }}>
                                    {orders.length} шт.
                                </span>
                            )}
                        </h2>
                        <button onClick={loadOrders} disabled={ordersLoading} style={btnSecondary}>
                            {ordersLoading ? '...' : 'Обновить'}
                        </button>
                    </div>

                    {ordersError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 10 }}>{ordersError}</p>}

                    {ordersLoading && <p style={muted}>Загрузка заказов...</p>}

                    {!ordersLoading && orders.length === 0 && (
                        <p style={{ ...muted, marginBottom: 0 }}>
                            Заказов пока нет.{' '}
                            <a href="/test-order" style={{ color: '#0070f3' }}>Создать заказ →</a>
                        </p>
                    )}

                    {!ordersLoading && orders.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #ddd' }}>
                                    <th style={th}>Заказ</th>
                                    <th style={th}>Статус</th>
                                    <th style={th}>Состав</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Дата</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.id}
                                        style={{
                                            borderBottom: '1px solid #eee',
                                            background: selectedOrder?.id === o.id ? '#f0f4ff' : 'transparent',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => handleSelectOrder(o.id)}
                                    >
                                        <td style={{ padding: '9px 8px 9px 0', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
                                            {o.id.slice(0, 8)}…
                                        </td>
                                        <td style={{ padding: '9px 8px' }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600,
                                                color: STATE_COLOR[o.state] ?? '#333',
                                                background: '#f5f5f5', borderRadius: 4,
                                                padding: '2px 6px', whiteSpace: 'nowrap',
                                            }}>
                                                {stateLabels[o.state] ?? o.state}
                                            </span>
                                        </td>
                                        <td style={{ padding: '9px 8px', color: '#555', fontSize: 12 }}>
                                            {o.items.length} поз.
                                        </td>
                                        <td style={{ padding: '9px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                            {o.totalAmount.toLocaleString('ru')} ₽
                                        </td>
                                        <td style={{ padding: '9px 0 9px 8px', textAlign: 'right', whiteSpace: 'nowrap', color: '#888', fontSize: 11 }}>
                                            {new Date(o.createdAt).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '9px 0 9px 8px', textAlign: 'right' }}>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleSelectOrder(o.id); }}
                                                style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}
                                            >
                                                {selectedOrder?.id === o.id ? 'Скрыть' : 'Открыть'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}

            {/* ── Детальный просмотр заказа ── */}
            {authStep === 'authenticated' && (detailLoading || detailError || selectedOrder) && (
                <section style={{ ...sectionStyle, background: '#f0f4ff', borderColor: '#c0d0f0' }}>
                    <h2 style={{ ...sectionHead, marginBottom: 14 }}>
                        Детали заказа
                        {selectedOrder && (
                            <span style={{ marginLeft: 10, fontSize: 12, color: '#888', fontWeight: 400, fontFamily: 'monospace' }}>
                                {selectedOrder.id}
                            </span>
                        )}
                    </h2>

                    {detailLoading && <p style={muted}>Загрузка...</p>}
                    {detailError && <p style={{ color: '#c00', fontSize: 13 }}>{detailError}</p>}

                    {selectedOrder && !detailLoading && (
                        <>
                            {/* Шапка */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ fontSize: 13 }}>
                                    <span style={{
                                        fontWeight: 700, fontSize: 14,
                                        color: STATE_COLOR[selectedOrder.state] ?? '#333',
                                    }}>
                                        {stateLabels[selectedOrder.state] ?? selectedOrder.state}
                                    </span>
                                    <span style={{ marginLeft: 12, color: '#444' }}>
                                        {selectedOrder.totalAmount.toLocaleString('ru')} ₽
                                    </span>
                                    <span style={{ marginLeft: 12, color: '#888', fontSize: 11 }}>
                                        {new Date(selectedOrder.createdAt).toLocaleString('ru')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleRepeat(selectedOrder.id)}
                                        disabled={actionLoading}
                                        style={btnSuccess}
                                        title="Создать новый заказ с теми же позициями по актуальным ценам"
                                    >
                                        {actionLoading ? '...' : '↻ Повторить заказ'}
                                    </button>
                                    {CANCELLABLE.has(selectedOrder.state) && (
                                        <button
                                            onClick={() => handleCancel(selectedOrder.id)}
                                            disabled={actionLoading}
                                            style={btnDanger}
                                        >
                                            {actionLoading ? '...' : 'Отменить'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Результат действия */}
                            {actionResult && (
                                <p style={{ fontSize: 13, color: '#0a9e5c', background: '#f0fff4', border: '1px solid #b7ebc5', borderRadius: 4, padding: '6px 10px', marginBottom: 12 }}>
                                    ✓ {actionResult}
                                </p>
                            )}
                            {actionError && (
                                <p style={{ fontSize: 13, color: '#c00', background: '#fee', border: '1px solid #fcc', borderRadius: 4, padding: '6px 10px', marginBottom: 12 }}>
                                    Ошибка: {actionError}
                                </p>
                            )}

                            {/* Мета */}
                            <table style={{ fontSize: 12, borderCollapse: 'collapse', marginBottom: 16 }}>
                                <tbody>
                                    {[
                                        ['Адрес доставки', selectedOrder.address],
                                        ['Стратегия отсутствия', absenceLabels[selectedOrder.absenceResolutionStrategy] ?? selectedOrder.absenceResolutionStrategy],
                                        ['Обновлён', new Date(selectedOrder.updatedAt).toLocaleString('ru')],
                                    ].map(([label, value]) => (
                                        <tr key={label}>
                                            <td style={{ padding: '3px 16px 3px 0', color: '#666', whiteSpace: 'nowrap' }}>{label}</td>
                                            <td style={{ padding: '3px 0' }}>{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Позиции */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #c0d0f0' }}>
                                        <th style={th}>Наименование</th>
                                        <th style={th}>Артикул</th>
                                        <th style={{ ...th, textAlign: 'right' }}>Цена</th>
                                        <th style={{ ...th, textAlign: 'center' }}>Кол-во</th>
                                        <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((item, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #dde8ff' }}>
                                            <td style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>{item.name}</td>
                                            <td style={{ padding: '6px 8px', color: '#666' }}>{item.article}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                {item.price.toLocaleString('ru')} ₽
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>× {item.quantity}</td>
                                            <td style={{ padding: '6px 0 6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                {(item.price * item.quantity).toLocaleString('ru')} ₽
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} style={{ padding: '8px 8px 0 0', textAlign: 'right', fontWeight: 600 }}>Итого:</td>
                                        <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {selectedOrder.totalAmount.toLocaleString('ru')} ₽
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}

// ── Вспомогательные функции ───────────────────────────────────────────────────

function plural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

function roleColor(role: string) {
    if (role === 'ADMIN') return '#c00';
    if (role === 'STAFF') return '#0070f3';
    return '#0a9e5c';
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    marginBottom: 32, padding: 16, background: '#f8f8f8', borderRadius: 6, border: '1px solid #ddd',
};

const sectionHead: React.CSSProperties = { fontSize: 15, marginBottom: 12, marginTop: 0 };
const muted: React.CSSProperties = { color: '#888', fontSize: 13 };
const th: React.CSSProperties = { textAlign: 'left', padding: '4px 8px 6px 0', fontWeight: 600, color: '#444', fontSize: 12 };

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    fontFamily: 'monospace', border: '1px solid #ccc',
    borderRadius: 4, boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
    padding: '10px 24px', fontSize: 14, background: '#0070f3',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSuccess: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#0a9e5c',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#e53e3e',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, background: '#f0f0f0',
    color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
};
