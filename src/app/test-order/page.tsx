'use client';

import { useState } from 'react';

interface Item {
    productId: string;
    quantity: number;
}

interface OrderResult {
    id: string;
    state: string;
    totalAmount: number;
    address: string;
    items: any[];
    createdAt: string;
    updatedAt: string;
}

const STATE_LABELS: Record<string, string> = {
    CREATED: 'Создан',
    PICKING: 'Сборка',
    PAYMENT: 'Ожидание оплаты',
    DELIVERY: 'Доставка',
    CLOSED: 'Закрыт',
    CANCELLED: 'Отменён',
};

const STATE_ACTIONS: Record<string, { label: string; endpoint: string }> = {
    CREATED: { label: 'Начать сборку', endpoint: 'start-picking' },
    PICKING: { label: 'Завершить сборку', endpoint: 'complete-picking' },
    PAYMENT: { label: 'Оплатить заказ', endpoint: 'pay' },
    DELIVERY: { label: 'Закрыть заказ', endpoint: 'close' },
};

const CANCELLABLE_STATES = new Set(['CREATED', 'PICKING', 'PAYMENT']);

export default function TestOrderPage() {
    const [userId, setUserId] = useState('UT');
    const [address, setAddress] = useState('Тестовый адрес');
    const [items, setItems] = useState<Item[]>([{ productId: 'PT', quantity: 1 }]);
    const [order, setOrder] = useState<OrderResult | null>(null);
    const [paymentResult, setPaymentResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function updateItem(index: number, field: keyof Item, value: string | number) {
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    }

    function addItem() {
        setItems(prev => [...prev, { productId: '', quantity: 1 }]);
    }

    function removeItem(index: number) {
        setItems(prev => prev.filter((_, i) => i !== index));
    }

    async function handleCreateOrder(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setOrder(null);
        setPaymentResult(null);
        setLoading(true);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, address, items }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }

            setOrder(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(endpoint: string) {
        if (!order) return;
        setError(null);
        setPaymentResult(null);
        setLoading(true);

        try {
            const response = await fetch(`/api/orders/${order.id}/${endpoint}`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }

            if (endpoint === 'pay') {
                setOrder(data.order);
                setPaymentResult(data.payment);
            } else {
                setOrder(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const action = order ? STATE_ACTIONS[order.state] : null;
    const canCancel = order ? CANCELLABLE_STATES.has(order.state) : false;

    return (
        <div style={{ padding: 40, maxWidth: 600, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 24 }}>Тестирование жизненного цикла заказа</h1>

            <form onSubmit={handleCreateOrder}>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>User ID</label>
                    <input
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>Адрес</label>
                    <input
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8 }}>Товары</label>
                    {items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input
                                placeholder="Product ID"
                                value={item.productId}
                                onChange={e => updateItem(i, 'productId', e.target.value)}
                                style={{ ...inputStyle, flex: 2 }}
                            />
                            <input
                                type="number"
                                min={1}
                                placeholder="Кол-во"
                                value={item.quantity}
                                onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={() => removeItem(i)}
                                disabled={items.length === 1}
                                style={btnSecondary}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addItem} style={btnSecondary}>
                        + Добавить товар
                    </button>
                </div>

                <button type="submit" disabled={loading} style={btnPrimary}>
                    {loading ? 'Отправка...' : 'Создать заказ'}
                </button>
            </form>

            {error && (
                <pre style={{ marginTop: 24, padding: 16, background: '#fee', color: '#c00', borderRadius: 4 }}>
                    Ошибка: {error}
                </pre>
            )}

            {order && (
                <div style={{ marginTop: 24 }}>
                    <div style={{
                        padding: 12,
                        marginBottom: 12,
                        background: '#f0f4ff',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>
                            <strong>Заказ {order.id.slice(0, 8)}…</strong>
                            {' — '}
                            <span style={{ color: '#0070f3' }}>
                                {STATE_LABELS[order.state] ?? order.state}
                            </span>
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {action && (
                                <button
                                    onClick={() => handleAction(action.endpoint)}
                                    disabled={loading}
                                    style={order.state === 'PAYMENT' ? btnSuccess : btnPrimary}
                                >
                                    {loading ? '...' : action.label}
                                </button>
                            )}
                            {canCancel && (
                                <button
                                    onClick={() => handleAction('cancel')}
                                    disabled={loading}
                                    style={btnDanger}
                                >
                                    {loading ? '...' : 'Отменить'}
                                </button>
                            )}
                        </div>
                    </div>

                    <pre style={{ padding: 16, background: '#eff', borderRadius: 4, fontSize: 12 }}>
                        {JSON.stringify(order, null, 2)}
                    </pre>

                    {paymentResult && (
                        <>
                            <div style={{ marginTop: 12, fontWeight: 'bold' }}>Платёж:</div>
                            <pre style={{ padding: 16, background: '#efe', borderRadius: 4, fontSize: 12 }}>
                                {JSON.stringify(paymentResult, null, 2)}
                            </pre>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    fontFamily: 'monospace',
    border: '1px solid #ccc',
    borderRadius: 4,
    boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    background: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
};

const btnSuccess: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    background: '#0a9e5c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
    padding: '10px 24px',
    fontSize: 14,
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 13,
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: 4,
    cursor: 'pointer',
};
