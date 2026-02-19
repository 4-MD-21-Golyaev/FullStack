'use client';

import { useState, useEffect } from 'react';

// ── Типы ────────────────────────────────────────────────────────────────────

interface Category {
    id: string;
    name: string;
    imagePath: string | null;
    parentId: string | null;
}

interface ProductCard {
    id: string;
    name: string;
    price: number;
    imagePath: string | null;
}

interface ProductDetail {
    id: string;
    name: string;
    article: string;
    price: number;
    stock: number;
    imagePath: string | null;
    categoryId: string;
}

interface OrderItem {
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

// ── Константы ────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
    CREATED: 'Создан',
    PICKING: 'Сборка',
    PAYMENT: 'Ожидание оплаты',
    DELIVERY: 'Доставка',
    CLOSED: 'Закрыт',
    CANCELLED: 'Отменён',
};

const STATE_ACTIONS: Record<string, { label: string; endpoint: string }> = {
    CREATED: { label: 'Начать сборку',    endpoint: 'start-picking' },
    PICKING: { label: 'Завершить сборку', endpoint: 'complete-picking' },
    PAYMENT: { label: 'Оплатить заказ',   endpoint: 'pay' },
    DELIVERY: { label: 'Закрыть заказ',  endpoint: 'close' },
};

const CANCELLABLE_STATES = new Set(['CREATED', 'PICKING', 'PAYMENT']);

// ── Компонент ────────────────────────────────────────────────────────────────

export default function TestOrderPage() {

    // Каталог
    const [categoryPath, setCategoryPath] = useState<Category[]>([]);
    const [currentCategories, setCurrentCategories] = useState<Category[]>([]);
    const [currentProducts, setCurrentProducts] = useState<ProductCard[] | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(true);

    // Форма заказа
    const [userId, setUserId]   = useState('UT');
    const [address, setAddress] = useState('Тестовый адрес');
    const [items, setItems]     = useState<OrderItem[]>([{ productId: '', quantity: 1 }]);
    const [order, setOrder]     = useState<OrderResult | null>(null);
    const [error, setError]     = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Загрузка корневых категорий
    useEffect(() => {
        loadCategories(null, []);
    }, []);

    async function loadCategories(parentId: string | null, newPath: Category[]) {
        setCatalogLoading(true);
        setCurrentProducts(null);
        setSelectedProduct(null);

        const url = parentId ? `/api/categories?parentId=${parentId}` : '/api/categories';
        const res = await fetch(url);
        const cats: Category[] = await res.json();

        setCategoryPath(newPath);
        setCurrentCategories(cats);
        setCatalogLoading(false);
    }

    async function handleCategoryClick(category: Category) {
        setCatalogLoading(true);
        setSelectedProduct(null);

        const res = await fetch(`/api/categories?parentId=${category.id}`);
        const children: Category[] = await res.json();
        const newPath = [...categoryPath, category];

        if (children.length > 0) {
            setCategoryPath(newPath);
            setCurrentCategories(children);
            setCurrentProducts(null);
        } else {
            // Листовая категория — загружаем товары
            const prodRes = await fetch(`/api/products?categoryId=${category.id}`);
            const products: ProductCard[] = await prodRes.json();
            setCategoryPath(newPath);
            setCurrentCategories([]);
            setCurrentProducts(products);
        }

        setCatalogLoading(false);
    }

    async function handleBreadcrumbClick(index: number) {
        // index === -1 → корень
        if (index === -1) {
            loadCategories(null, []);
        } else {
            const category = categoryPath[index];
            const newPath  = categoryPath.slice(0, index + 1);
            loadCategories(category.id, newPath);
        }
    }

    async function handleSelectProduct(id: string) {
        if (selectedProduct?.id === id) {
            setSelectedProduct(null);
            return;
        }
        const res  = await fetch(`/api/products/${id}`);
        const data = await res.json();
        setSelectedProduct(data);
    }

    function addProductToOrder(productId: string) {
        setItems(prev => {
            const existing = prev.find(i => i.productId === productId);
            if (existing) {
                return prev.map(i => i.productId === productId
                    ? { ...i, quantity: i.quantity + 1 } : i);
            }
            // Заменяем первую пустую строку, иначе добавляем новую
            const emptyIdx = prev.findIndex(i => i.productId === '');
            if (emptyIdx !== -1) {
                return prev.map((i, idx) => idx === emptyIdx ? { productId, quantity: 1 } : i);
            }
            return [...prev, { productId, quantity: 1 }];
        });
    }

    // ── Форма заказа ─────────────────────────────────────────────────────────

    function updateItem(index: number, field: keyof OrderItem, value: string | number) {
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
        setLoading(true);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, address, items }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unknown error');
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
        setLoading(true);
        try {
            const response = await fetch(`/api/orders/${order.id}/${endpoint}`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unknown error');
            if (endpoint === 'pay') {
                window.location.href = data.confirmationUrl;
            } else {
                setOrder(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const action    = order ? STATE_ACTIONS[order.state] : null;
    const canCancel = order ? CANCELLABLE_STATES.has(order.state) : false;

    // ── Рендер ───────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 760, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 28 }}>Тестирование жизненного цикла заказа</h1>

            {/* ── Каталог ── */}
            <section style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Каталог</h2>

                {/* Хлебные крошки */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14, fontSize: 12 }}>
                    <button
                        onClick={() => handleBreadcrumbClick(-1)}
                        style={categoryPath.length === 0 ? crumbActive : crumbBtn}
                    >
                        Все категории
                    </button>
                    {categoryPath.map((cat, i) => (
                        <span key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#aaa' }}>›</span>
                            <button
                                onClick={() => handleBreadcrumbClick(i)}
                                style={i === categoryPath.length - 1 ? crumbActive : crumbBtn}
                            >
                                {cat.name}
                            </button>
                        </span>
                    ))}
                </div>

                {catalogLoading ? (
                    <p style={{ color: '#888', fontSize: 13 }}>Загрузка...</p>
                ) : currentProducts !== null ? (
                    /* Листовой уровень — товары */
                    currentProducts.length === 0 ? (
                        <p style={{ color: '#888', fontSize: 13 }}>Товаров нет</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {currentProducts.map(p => (
                                <div key={p.id} style={{ width: 150 }}>
                                    <div
                                        onClick={() => handleSelectProduct(p.id)}
                                        style={{
                                            border: selectedProduct?.id === p.id
                                                ? '2px solid #0070f3' : '1px solid #ddd',
                                            borderRadius: 6,
                                            padding: 10,
                                            cursor: 'pointer',
                                            background: selectedProduct?.id === p.id ? '#f0f4ff' : '#fff',
                                        }}
                                    >
                                        <Thumbnail src={p.imagePath} alt={p.name} />
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: '#0a9e5c' }}>{p.price.toLocaleString('ru')} ₽</div>
                                    </div>
                                    <button
                                        onClick={() => addProductToOrder(p.id)}
                                        style={{ ...btnSecondary, width: '100%', marginTop: 4, fontSize: 11 }}
                                    >
                                        + В заказ
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* Уровень категорий */
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {currentCategories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat)}
                                style={{
                                    width: 150,
                                    border: '1px solid #ddd',
                                    borderRadius: 6,
                                    padding: 10,
                                    cursor: 'pointer',
                                    background: '#fff',
                                }}
                            >
                                <Thumbnail src={cat.imagePath} alt={cat.name} />
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{cat.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Детальная карточка товара */}
                {selectedProduct && (
                    <div style={{ marginTop: 16, padding: 14, background: '#f8f8f8', borderRadius: 6, border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <strong style={{ fontSize: 13 }}>{selectedProduct.name}</strong>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
                            <tbody>
                                {([
                                    ['ID',        selectedProduct.id],
                                    ['Артикул',   selectedProduct.article],
                                    ['Цена',      `${selectedProduct.price.toLocaleString('ru')} ₽`],
                                    ['Остаток',   `${selectedProduct.stock} шт.`],
                                    ['Фото',      selectedProduct.imagePath ?? '—'],
                                ] as [string, string][]).map(([label, value]) => (
                                    <tr key={label}>
                                        <td style={{ padding: '3px 10px 3px 0', color: '#666', whiteSpace: 'nowrap' }}>{label}</td>
                                        <td style={{ padding: '3px 0', wordBreak: 'break-all' }}>{value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ── Форма заказа ── */}
            <form onSubmit={handleCreateOrder}>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>User ID</label>
                    <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>Адрес</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
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
                        + Добавить строку
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
                        padding: 12, marginBottom: 12, background: '#f0f4ff', borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span>
                            <strong>Заказ {order.id.slice(0, 8)}…</strong>
                            {' — '}
                            <span style={{ color: '#0070f3' }}>{STATE_LABELS[order.state] ?? order.state}</span>
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
                                <button onClick={() => handleAction('cancel')} disabled={loading} style={btnDanger}>
                                    {loading ? '...' : 'Отменить'}
                                </button>
                            )}
                        </div>
                    </div>
                    <pre style={{ padding: 16, background: '#eff', borderRadius: 4, fontSize: 12 }}>
                        {JSON.stringify(order, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ── Вспомогательный компонент ─────────────────────────────────────────────────

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
    return (
        <div style={{
            height: 80, background: '#f5f5f5', borderRadius: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#aaa', overflow: 'hidden',
        }}>
            {src
                ? <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                : 'нет фото'
            }
        </div>
    );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

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
    padding: '10px 24px', fontSize: 14, background: '#0a9e5c',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
    padding: '10px 24px', fontSize: 14, background: '#e53e3e',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, background: '#f0f0f0',
    color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
};

const crumbBtn: React.CSSProperties = {
    padding: '3px 8px', fontSize: 12, background: 'none',
    border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', color: '#0070f3',
};

const crumbActive: React.CSSProperties = {
    padding: '3px 8px', fontSize: 12, background: '#f0f0f0',
    border: '1px solid #ccc', borderRadius: 4, cursor: 'default', color: '#333',
};
