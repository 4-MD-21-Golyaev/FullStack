'use client';

import { useState, useEffect } from 'react';

// ── Типы ────────────────────────────────────────────────────────────────────

interface Session {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}

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

interface CartItemView {
    productId: string;
    name: string;
    article: string;
    price: number;
    stock: number;
    imagePath: string | null;
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

const LOCAL_CART_KEY = 'cart';

const STATE_LABELS: Record<string, string> = {
    CREATED:   'Создан',
    PICKING:   'Сборка',
    PAYMENT:   'Ожидание оплаты',
    DELIVERY:  'Доставка',
    CLOSED:    'Закрыт',
    CANCELLED: 'Отменён',
};

const STATE_ACTIONS: Record<string, { label: string; endpoint: string; staffOnly: boolean }> = {
    CREATED:  { label: 'Начать сборку',    endpoint: 'start-picking',    staffOnly: true  },
    PICKING:  { label: 'Завершить сборку', endpoint: 'complete-picking', staffOnly: true  },
    PAYMENT:  { label: 'Оплатить заказ',   endpoint: 'pay',              staffOnly: false },
    DELIVERY: { label: 'Закрыть заказ',    endpoint: 'close',            staffOnly: true  },
};

const ABSENCE_OPTIONS = [
    { value: 'CALL_REPLACE', label: 'Позвонить и предложить замену' },
    { value: 'CALL_REMOVE',  label: 'Позвонить и убрать позицию'    },
    { value: 'AUTO_REPLACE', label: 'Автоматически заменить'        },
    { value: 'AUTO_REMOVE',  label: 'Автоматически убрать'          },
];

const CANCELLABLE_STATES = new Set(['CREATED', 'PICKING', 'PAYMENT']);

// ── localStorage helpers ──────────────────────────────────────────────────────

function readLocalCart(): CartItemView[] {
    try { return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) ?? '[]'); }
    catch { return []; }
}

function writeLocalCart(items: CartItemView[]) {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

function clearLocalCart() {
    localStorage.removeItem(LOCAL_CART_KEY);
}

// ── Компонент ────────────────────────────────────────────────────────────────

type AuthStep = 'checking' | 'unauthenticated' | 'code-sent' | 'authenticated';

export default function TestOrderPage() {

    // Аутентификация
    const [authStep, setAuthStep]         = useState<AuthStep>('checking');
    const [session, setSession]           = useState<Session | null>(null);
    const [authEmail, setAuthEmail]       = useState('');
    const [authCode, setAuthCode]         = useState('');
    const [authPhone, setAuthPhone]       = useState('');
    const [authError, setAuthError]       = useState<string | null>(null);
    const [authLoading, setAuthLoading]   = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [devCode, setDevCode]           = useState<string | null>(null);

    // Каталог
    const [categoryPath, setCategoryPath]           = useState<Category[]>([]);
    const [currentCategories, setCurrentCategories] = useState<Category[]>([]);
    const [currentProducts, setCurrentProducts]     = useState<ProductCard[] | null>(null);
    const [selectedProduct, setSelectedProduct]     = useState<ProductDetail | null>(null);
    const [catalogLoading, setCatalogLoading]       = useState(true);

    // Корзина — единое состояние для всех пользователей.
    // Неавторизованный: данные в localStorage.
    // Авторизованный: данные в БД, синхронизируются при логине.
    const [cartItems, setCartItems]     = useState<CartItemView[]>([]);
    const [cartLoading, setCartLoading] = useState(false);
    const [cartError, setCartError]     = useState<string | null>(null);

    // Форма подтверждения
    const [address, setAddress]               = useState('Тестовый адрес');
    const [absenceStrategy, setAbsenceStrategy] = useState('CALL_REPLACE');

    // Зафиксированный заказ
    const [order, setOrder]               = useState<OrderResult | null>(null);
    const [orderError, setOrderError]     = useState<string | null>(null);
    const [orderLoading, setOrderLoading] = useState(false);

    // ── Инициализация ─────────────────────────────────────────────────────────

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setSession(data);
                    setAuthStep('authenticated');
                    // Первичный вход в уже авторизованной сессии: просто загружаем DB-корзину
                    loadDbCart();
                } else {
                    setAuthStep('unauthenticated');
                    setCartItems(readLocalCart());
                }
            })
            .catch(() => { setAuthStep('unauthenticated'); setCartItems(readLocalCart()); });
    }, []);

    useEffect(() => {
        loadCategories(null, []);
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
            await syncCartOnLogin();
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setAuthError(null); setAuthLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail, phone: authPhone }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            const codeRes = await fetch('/api/auth/request-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: authEmail }),
            });
            const codeData = await codeRes.json();
            if (codeData.code) setDevCode(codeData.code);
            setShowRegister(false); setAuthStep('code-sent');
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    }

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        clearLocalCart();
        setSession(null); setAuthStep('unauthenticated');
        setAuthEmail(''); setAuthCode('');
        setCartItems([]);
        setOrder(null); setOrderError(null);
    }

    // ── Синхронизация корзины при логине ──────────────────────────────────────
    //
    // Правило:
    //   • Локальная корзина непустая → приоритет: заменяет DB-корзину, localStorage очищается
    //   • Локальная корзина пустая   → загружается DB-корзина без изменений

    async function syncCartOnLogin() {
        const localItems = readLocalCart();
        setCartLoading(true);
        try {
            // POST /api/cart/sync: если items.length > 0 — заменяет DB-корзину,
            // иначе просто возвращает текущую DB-корзину
            const res = await fetch('/api/cart/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: localItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
                }),
            });
            const synced: CartItemView[] = await res.json();
            setCartItems(synced);
            clearLocalCart();
        } catch {
            // Если sync упал — просто загружаем DB-корзину
            await loadDbCart();
        } finally {
            setCartLoading(false);
        }
    }

    // ── Каталог ───────────────────────────────────────────────────────────────

    async function loadCategories(parentId: string | null, newPath: Category[]) {
        setCatalogLoading(true); setCurrentProducts(null); setSelectedProduct(null);
        const url = parentId ? `/api/categories?parentId=${parentId}` : '/api/categories';
        const cats: Category[] = await fetch(url).then(r => r.json());
        setCategoryPath(newPath); setCurrentCategories(cats); setCatalogLoading(false);
    }

    async function handleCategoryClick(category: Category) {
        setCatalogLoading(true); setSelectedProduct(null);
        const children: Category[] = await fetch(`/api/categories?parentId=${category.id}`).then(r => r.json());
        const newPath = [...categoryPath, category];
        if (children.length > 0) {
            setCategoryPath(newPath); setCurrentCategories(children); setCurrentProducts(null);
        } else {
            const products: ProductCard[] = await fetch(`/api/products?categoryId=${category.id}`).then(r => r.json());
            setCategoryPath(newPath); setCurrentCategories([]); setCurrentProducts(products);
        }
        setCatalogLoading(false);
    }

    async function handleBreadcrumbClick(index: number) {
        if (index === -1) loadCategories(null, []);
        else { const cat = categoryPath[index]; loadCategories(cat.id, categoryPath.slice(0, index + 1)); }
    }

    async function handleSelectProduct(id: string) {
        if (selectedProduct?.id === id) { setSelectedProduct(null); return; }
        setSelectedProduct(await fetch(`/api/products/${id}`).then(r => r.json()));
    }

    // ── Корзина ───────────────────────────────────────────────────────────────

    async function loadDbCart() {
        setCartLoading(true); setCartError(null);
        try {
            const res = await fetch('/api/cart');
            if (!res.ok) throw new Error('Не удалось загрузить корзину');
            setCartItems(await res.json());
        } catch (err: any) {
            setCartError(err.message);
        } finally {
            setCartLoading(false);
        }
    }

    // Добавить товар в корзину.
    // Для авторизованного — API + перезагрузка DB-корзины.
    // Для неавторизованного — fetch деталей товара, обновить localStorage.
    async function handleAddToCart(productId: string) {
        setCartError(null);
        if (authStep === 'authenticated') {
            try {
                const res = await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, quantity: 1 }),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
                await loadDbCart();
            } catch (err: any) {
                setCartError(err.message);
            }
        } else {
            // Неавторизованный: нужны полные данные товара для сохранения в localStorage
            try {
                const product: ProductDetail = await fetch(`/api/products/${productId}`).then(r => r.json());
                const existing = cartItems.find(i => i.productId === productId);
                const updated = existing
                    ? cartItems.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)
                    : [...cartItems, {
                        productId: product.id,
                        name: product.name,
                        article: product.article,
                        price: product.price,
                        stock: product.stock,
                        imagePath: product.imagePath,
                        quantity: 1,
                    }];
                writeLocalCart(updated);
                setCartItems(updated);
            } catch (err: any) {
                setCartError('Не удалось добавить товар: ' + err.message);
            }
        }
    }

    async function handleUpdateCartItem(productId: string, quantity: number) {
        setCartError(null);
        if (authStep === 'authenticated') {
            try {
                const res = await fetch(`/api/cart/${productId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity }),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
                await loadDbCart();
            } catch (err: any) {
                setCartError(err.message);
            }
        } else {
            const updated = cartItems.map(i => i.productId === productId ? { ...i, quantity } : i);
            writeLocalCart(updated); setCartItems(updated);
        }
    }

    async function handleRemoveFromCart(productId: string) {
        setCartError(null);
        if (authStep === 'authenticated') {
            try {
                const res = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
                if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
                await loadDbCart();
            } catch (err: any) {
                setCartError(err.message);
            }
        } else {
            const updated = cartItems.filter(i => i.productId !== productId);
            writeLocalCart(updated); setCartItems(updated);
        }
    }

    // ── Оформление заказа ─────────────────────────────────────────────────────

    async function handleConfirmCart(e: React.FormEvent) {
        e.preventDefault();
        setOrderError(null); setOrder(null); setOrderLoading(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    absenceResolutionStrategy: absenceStrategy,
                    items: cartItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Unknown error');
            setOrder(data);
            // Корзина очищена на сервере
            setCartItems([]);
        } catch (err: any) {
            setOrderError(err.message);
        } finally {
            setOrderLoading(false);
        }
    }

    // ── Жизненный цикл заказа ─────────────────────────────────────────────────

    async function handleOrderAction(endpoint: string) {
        if (!order) return;
        setOrderError(null); setOrderLoading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Unknown error');
            if (endpoint === 'pay') window.location.href = data.confirmationUrl;
            else setOrder(data);
        } catch (err: any) {
            setOrderError(err.message);
        } finally {
            setOrderLoading(false);
        }
    }

    const isStaff        = session?.role === 'STAFF' || session?.role === 'ADMIN';
    const availableItems = cartItems.filter(i => i.stock > 0);
    const outOfStockItems = cartItems.filter(i => i.stock === 0);
    const cartTotal      = availableItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const action         = order ? STATE_ACTIONS[order.state] : null;
    const canCancel      = order ? CANCELLABLE_STATES.has(order.state) : false;

    // ── Рендер ───────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 780, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 28 }}>Тестирование жизненного цикла заказа</h1>

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

                        {!showRegister ? (
                            <>
                                {authStep === 'unauthenticated' && (
                                    <form onSubmit={handleRequestCode} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <input type="email" placeholder="email" value={authEmail}
                                            onChange={e => setAuthEmail(e.target.value)} required
                                            style={{ ...inputStyle, flex: 1 }} />
                                        <button type="submit" disabled={authLoading} style={btnPrimary}>
                                            {authLoading ? '...' : 'Запросить код'}
                                        </button>
                                    </form>
                                )}
                                {authStep === 'code-sent' && (
                                    <form onSubmit={handleVerifyCode} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
                                    <p style={{ fontSize: 13, background: '#fffbe6', border: '1px solid #f0c040', borderRadius: 4, padding: '6px 10px', marginBottom: 8 }}>
                                        [DEV] Код: <strong style={{ letterSpacing: 2 }}>{devCode}</strong>
                                    </p>
                                )}
                                <button type="button" style={linkBtn}
                                    onClick={() => { setShowRegister(true); setAuthError(null); }}>
                                    Нет аккаунта? Зарегистрироваться
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                <input type="email" placeholder="email" value={authEmail}
                                    onChange={e => setAuthEmail(e.target.value)} required style={inputStyle} />
                                <input placeholder="телефон (+7...)" value={authPhone}
                                    onChange={e => setAuthPhone(e.target.value)} required style={inputStyle} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" disabled={authLoading} style={btnPrimary}>
                                        {authLoading ? '...' : 'Зарегистрироваться'}
                                    </button>
                                    <button type="button" style={btnSecondary}
                                        onClick={() => { setShowRegister(false); setAuthError(null); }}>
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        )}

                        {authError && <p style={{ color: '#c00', fontSize: 13, marginTop: 4, marginBottom: 0 }}>{authError}</p>}
                    </div>
                )}
            </section>

            {/* ── Каталог ── */}
            <section style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 16, marginBottom: 12 }}>Каталог</h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14, fontSize: 12 }}>
                    <button onClick={() => handleBreadcrumbClick(-1)} style={categoryPath.length === 0 ? crumbActive : crumbBtn}>
                        Все категории
                    </button>
                    {categoryPath.map((cat, i) => (
                        <span key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#aaa' }}>›</span>
                            <button onClick={() => handleBreadcrumbClick(i)}
                                style={i === categoryPath.length - 1 ? crumbActive : crumbBtn}>
                                {cat.name}
                            </button>
                        </span>
                    ))}
                </div>

                {catalogLoading ? (
                    <p style={muted}>Загрузка...</p>
                ) : currentProducts !== null ? (
                    currentProducts.length === 0 ? <p style={muted}>Товаров нет</p> : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {currentProducts.map(p => (
                                <div key={p.id} style={{ width: 150 }}>
                                    <div onClick={() => handleSelectProduct(p.id)} style={{
                                        border: selectedProduct?.id === p.id ? '2px solid #0070f3' : '1px solid #ddd',
                                        borderRadius: 6, padding: 10, cursor: 'pointer',
                                        background: selectedProduct?.id === p.id ? '#f0f4ff' : '#fff',
                                    }}>
                                        <Thumbnail src={p.imagePath} alt={p.name} />
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: '#0a9e5c' }}>{p.price.toLocaleString('ru')} ₽</div>
                                    </div>
                                    <button
                                        onClick={() => handleAddToCart(p.id)}
                                        style={{ ...btnSuccess, width: '100%', marginTop: 4, fontSize: 11, padding: '6px' }}
                                    >
                                        + В корзину
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {currentCategories.map(cat => (
                            <div key={cat.id} onClick={() => handleCategoryClick(cat)}
                                style={{ width: 150, border: '1px solid #ddd', borderRadius: 6, padding: 10, cursor: 'pointer', background: '#fff' }}>
                                <Thumbnail src={cat.imagePath} alt={cat.name} />
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{cat.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedProduct && (
                    <div style={{ marginTop: 16, padding: 14, background: '#f8f8f8', borderRadius: 6, border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <strong style={{ fontSize: 13 }}>{selectedProduct.name}</strong>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
                            <tbody>
                                {([
                                    ['ID',      selectedProduct.id],
                                    ['Артикул', selectedProduct.article],
                                    ['Цена',    `${selectedProduct.price.toLocaleString('ru')} ₽`],
                                    ['Остаток', `${selectedProduct.stock} шт.`],
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

            {/* ── Корзина ── */}
            {authStep !== 'checking' && (
                <section style={{
                    ...sectionStyle,
                    background: authStep === 'authenticated' ? '#f0fff4' : '#fafaf8',
                    borderColor: authStep === 'authenticated' ? '#b7ebc5' : '#ddd',
                    marginBottom: 36,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ ...sectionHead, marginBottom: 0 }}>
                            Корзина
                            {cartItems.length > 0 && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#0a9e5c', fontWeight: 400 }}>
                                    {cartItems.length} поз. · {cartTotal.toLocaleString('ru')} ₽
                                </span>
                            )}
                            {authStep !== 'authenticated' && (
                                <span style={{ marginLeft: 10, fontSize: 11, color: '#888', fontWeight: 400 }}>
                                    (локальная, не сохраняется в БД)
                                </span>
                            )}
                            {authStep === 'authenticated' && (
                                <span style={{ marginLeft: 10, fontSize: 11, color: '#0a9e5c', fontWeight: 400 }}>
                                    (синхронизирована с БД)
                                </span>
                            )}
                        </h2>
                        {authStep === 'authenticated' && (
                            <button onClick={loadDbCart} disabled={cartLoading} style={btnSecondary}>
                                {cartLoading ? '...' : 'Обновить'}
                            </button>
                        )}
                    </div>

                    {cartError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 10 }}>{cartError}</p>}
                    {cartLoading && <p style={muted}>Синхронизация корзины...</p>}

                    {!cartLoading && cartItems.length === 0 && (
                        <p style={{ ...muted, marginBottom: 0 }}>
                            Корзина пуста. Добавьте товары кнопкой «+ В корзину» в каталоге.
                        </p>
                    )}

                    {!cartLoading && cartItems.length > 0 && (
                        <>
                            {availableItems.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                                            <th style={th}>Товар</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Цена</th>
                                            <th style={{ ...th, textAlign: 'center' }}>Кол-во</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                                            <th style={{ width: 28 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableItems.map(item => (
                                            <tr key={item.productId} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '7px 8px 7px 0' }}>
                                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                    <div style={{ fontSize: 11, color: '#888' }}>{item.article}</div>
                                                </td>
                                                <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {item.price.toLocaleString('ru')} ₽
                                                </td>
                                                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                        <button style={{ ...btnSecondary, padding: '1px 8px', lineHeight: 1.5 }}
                                                            onClick={() => item.quantity > 1
                                                                ? handleUpdateCartItem(item.productId, item.quantity - 1)
                                                                : handleRemoveFromCart(item.productId)
                                                            }>−</button>
                                                        <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                                        <button style={{ ...btnSecondary, padding: '1px 8px', lineHeight: 1.5 }}
                                                            onClick={() => handleUpdateCartItem(item.productId, item.quantity + 1)}>+</button>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '7px 0 7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    {(item.price * item.quantity).toLocaleString('ru')} ₽
                                                </td>
                                                <td style={{ textAlign: 'center', paddingLeft: 4 }}>
                                                    <button onClick={() => handleRemoveFromCart(item.productId)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 14 }}
                                                        title="Удалить">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} style={{ padding: '8px 8px 0 0', textAlign: 'right', fontWeight: 600 }}>Итого:</td>
                                            <td style={{ padding: '8px 0 0 8px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {cartTotal.toLocaleString('ru')} ₽
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}

                            {/* Нет в наличии */}
                            {outOfStockItems.length > 0 && (
                                <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Нет в наличии
                                    </div>
                                    {outOfStockItems.map(item => (
                                        <div key={item.productId} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '7px 0', borderBottom: '1px solid #eee', gap: 8, opacity: 0.6,
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{item.name}</div>
                                                <div style={{ fontSize: 11, color: '#999' }}>{item.article}</div>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                                                {item.price.toLocaleString('ru')} ₽ × {item.quantity}
                                            </div>
                                            <button onClick={() => handleRemoveFromCart(item.productId)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 14, flexShrink: 0 }}
                                                title="Удалить">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Форма подтверждения или предложение войти */}
                            {authStep === 'authenticated' ? (
                                <form onSubmit={handleConfirmCart}
                                    style={{ borderTop: '1px solid #b7ebc5', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#444' }}>Адрес доставки</label>
                                        <input value={address} onChange={e => setAddress(e.target.value)}
                                            required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#444' }}>При отсутствии товара</label>
                                        <select value={absenceStrategy} onChange={e => setAbsenceStrategy(e.target.value)}
                                            style={{ ...inputStyle, width: 'auto' }}>
                                            {ABSENCE_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <button type="submit" disabled={orderLoading} style={btnPrimary}>
                                            {orderLoading ? 'Оформление...' : 'Оформить заказ'}
                                        </button>
                                        <span style={{ fontSize: 12, color: '#666' }}>
                                            Данные товаров фиксируются на момент подтверждения
                                        </span>
                                    </div>
                                </form>
                            ) : (
                                <div style={{ borderTop: '1px solid #ddd', paddingTop: 14 }}>
                                    <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                                        Для оформления заказа необходимо{' '}
                                        <button style={linkBtn}
                                            onClick={() => { setAuthStep('unauthenticated'); setAuthError(null); }}>
                                            войти в систему
                                        </button>
                                        . Товары из корзины будут сохранены.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* ── Зафиксированный заказ и жизненный цикл ── */}
            {orderError && (
                <pre style={{ marginBottom: 16, padding: 14, background: '#fee', color: '#c00', borderRadius: 4, fontSize: 12 }}>
                    Ошибка: {orderError}
                </pre>
            )}

            {order && (
                <section style={{ ...sectionStyle, background: '#f0f4ff', borderColor: '#c0d0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <strong style={{ fontSize: 14 }}>Заказ {order.id.slice(0, 8)}…</strong>
                            {' — '}
                            <span style={{ color: '#0070f3', fontWeight: 600 }}>{STATE_LABELS[order.state] ?? order.state}</span>
                            <span style={{ marginLeft: 12, fontSize: 12, color: '#666' }}>
                                {order.totalAmount.toLocaleString('ru')} ₽
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {action && (
                                action.staffOnly && !isStaff
                                    ? <span style={{ fontSize: 12, color: '#888' }}>{action.label} — только STAFF/ADMIN</span>
                                    : (
                                        <button onClick={() => handleOrderAction(action.endpoint)}
                                            disabled={orderLoading}
                                            style={order.state === 'PAYMENT' ? btnSuccess : btnPrimary}>
                                            {orderLoading ? '...' : action.label}
                                        </button>
                                    )
                            )}
                            {canCancel && (
                                <button onClick={() => handleOrderAction('cancel')} disabled={orderLoading} style={btnDanger}>
                                    {orderLoading ? '...' : 'Отменить'}
                                </button>
                            )}
                        </div>
                    </div>
                    <pre style={{ padding: 12, background: '#e8eeff', borderRadius: 4, fontSize: 11, overflow: 'auto', margin: 0 }}>
                        {JSON.stringify(order, null, 2)}
                    </pre>
                </section>
            )}
        </div>
    );
}

// ── Вспомогательные компоненты ────────────────────────────────────────────────

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
const linkBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: 13, padding: 0,
};
const crumbBtn: React.CSSProperties = {
    padding: '3px 8px', fontSize: 12, background: 'none',
    border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', color: '#0070f3',
};
const crumbActive: React.CSSProperties = {
    padding: '3px 8px', fontSize: 12, background: '#f0f0f0',
    border: '1px solid #ccc', borderRadius: 4, cursor: 'default', color: '#333',
};
