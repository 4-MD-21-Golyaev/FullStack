'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Типы ──────────────────────────────────────────────────────────────────────

type AuthStep = 'checking' | 'unauth' | 'code-sent' | 'authed';
type Tab = 'orders' | 'payments' | 'jobs' | 'audit';

interface Session {
    userId: string;
    email: string;
    role: string;
}

interface AdminOrder {
    id: string;
    state: string;
    totalAmount: number;
    createdAt: string;
    userId?: string;
    userEmail?: string;
}

interface PaymentIssue {
    paymentId: string;
    orderId: string;
    status: string;
    amount: number;
    createdAt: string;
    [key: string]: unknown;
}

interface JobStatus {
    jobName: string;
    lastRunAt?: string;
    lastStatus?: string;
    lastDurationMs?: number;
    [key: string]: unknown;
}

interface AuditEntry {
    ts: string;
    op: string;
    endpoint: string;
    status: number;
    details?: string;
}

// ── Константы ─────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<string, string> = {
    CREATED:           '#0070f3',
    PICKING:           '#e07b00',
    PAYMENT:           '#7b3fbf',
    DELIVERY:          '#0a9e5c',
    DELIVERY_ASSIGNED: '#0a9e5c',
    OUT_FOR_DELIVERY:  '#0a7e50',
    DELIVERED:         '#555',
    CLOSED:            '#444',
    CANCELLED:         '#c00',
};

const KNOWN_JOBS = ['payment-timeout', 'process-outbox', 'sync-products'];

// ── Компонент ─────────────────────────────────────────────────────────────────

export default function TestAdminOpsPage() {

    // Аутентификация
    const [authStep, setAuthStep]       = useState<AuthStep>('checking');
    const [session, setSession]         = useState<Session | null>(null);
    const [authEmail, setAuthEmail]     = useState('');
    const [authCode, setAuthCode]       = useState('');
    const [authError, setAuthError]     = useState<string | null>(null);
    const [devCode, setDevCode]         = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);

    // Вкладки
    const [activeTab, setActiveTab] = useState<Tab>('orders');

    // ─ Orders ─
    const [orders, setOrders]             = useState<AdminOrder[]>([]);
    const [ordersTotal, setOrdersTotal]   = useState<number | null>(null);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError]   = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]     = useState('');

    // ─ Payment Issues ─
    const [issues, setIssues]           = useState<PaymentIssue[]>([]);
    const [issuesLoading, setIssuesLoading] = useState(false);
    const [issuesError, setIssuesError] = useState<string | null>(null);
    const [markFailedReason, setMarkFailedReason] = useState<Record<string, string>>({});
    const [issueActionLoading, setIssueActionLoading] = useState<string | null>(null);
    const [issueActionResult, setIssueActionResult]   = useState<string | null>(null);
    const [issueActionError, setIssueActionError]     = useState<string | null>(null);

    // ─ Jobs ─
    const [jobStatuses, setJobStatuses]       = useState<Record<string, JobStatus | null>>({});
    const [jobStatusLoading, setJobStatusLoading] = useState<Record<string, boolean>>({});
    const [jobRunLoading, setJobRunLoading]   = useState<Record<string, boolean>>({});
    const [jobRunResult, setJobRunResult]     = useState<string | null>(null);
    const [jobRunError, setJobRunError]       = useState<string | null>(null);

    // ─ Audit ─
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

    // ── Инициализация ─────────────────────────────────────────────────────────

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) { setSession(d); setAuthStep('authed'); } else setAuthStep('unauth'); })
            .catch(() => setAuthStep('unauth'));
    }, []);

    function addAudit(op: string, endpoint: string, status: number, details?: string) {
        setAuditLog(prev => [
            { ts: new Date().toISOString(), op, endpoint, status, details },
            ...prev,
        ].slice(0, 200));
    }

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
        setOrders([]); setIssues([]);
        setAuditLog([]);
        setAuthEmail(''); setAuthCode('');
    }

    // ── Orders tab ────────────────────────────────────────────────────────────

    const loadOrders = useCallback(async (params?: {
        status?: string; search?: string; dateFrom?: string; dateTo?: string;
    }) => {
        setOrdersLoading(true); setOrdersError(null);
        const qs = new URLSearchParams();
        if (params?.status)   qs.set('status', params.status);
        if (params?.search)   qs.set('search', params.search);
        if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
        if (params?.dateTo)   qs.set('dateTo', params.dateTo);
        const endpoint = `/api/admin/orders${qs.toString() ? '?' + qs : ''}`;
        try {
            const r = await fetch(endpoint);
            if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
            const data = await r.json();
            if (Array.isArray(data)) {
                setOrders(data); setOrdersTotal(data.length);
            } else {
                setOrders(data.items ?? data.orders ?? []); setOrdersTotal(data.total ?? null);
            }
            addAudit('GET orders', endpoint, r.status);
        } catch (e: any) {
            setOrdersError(e.message);
            addAudit('GET orders', endpoint, 0, e.message);
        } finally { setOrdersLoading(false); }
    }, []);

    function handleOrdersFilter(e: React.FormEvent) {
        e.preventDefault();
        loadOrders({ status: filterStatus, search: filterSearch, dateFrom: filterDateFrom, dateTo: filterDateTo });
    }

    useEffect(() => {
        if (authStep === 'authed') loadOrders();
    }, [authStep, loadOrders]);

    // ── Payment Issues tab ────────────────────────────────────────────────────

    const loadIssues = useCallback(async () => {
        setIssuesLoading(true); setIssuesError(null);
        const endpoint = '/api/admin/payments/issues';
        try {
            const r = await fetch(endpoint);
            if (!r.ok) throw new Error((await r.json()).message ?? `HTTP ${r.status}`);
            setIssues(await r.json());
            addAudit('GET payment issues', endpoint, r.status);
        } catch (e: any) {
            setIssuesError(e.message);
            addAudit('GET payment issues', endpoint, 0, e.message);
        } finally { setIssuesLoading(false); }
    }, []);

    useEffect(() => {
        if (authStep === 'authed' && activeTab === 'payments') loadIssues();
    }, [authStep, activeTab, loadIssues]);

    async function handleRetry(paymentId: string) {
        setIssueActionLoading(paymentId); setIssueActionResult(null); setIssueActionError(null);
        const endpoint = `/api/admin/payments/${paymentId}/retry`;
        try {
            const r = await fetch(endpoint, { method: 'POST' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message ?? `HTTP ${r.status}`);
            setIssueActionResult(`[${paymentId.slice(0, 8)}…] retry: OK`);
            addAudit('POST payment retry', endpoint, r.status);
            await loadIssues();
        } catch (e: any) {
            setIssueActionError(`[${paymentId.slice(0, 8)}…] retry: ${e.message}`);
            addAudit('POST payment retry', endpoint, 0, e.message);
        } finally { setIssueActionLoading(null); }
    }

    async function handleMarkFailed(paymentId: string) {
        const reason = markFailedReason[paymentId]?.trim();
        if (!reason) {
            setIssueActionError('Укажите reason перед mark-failed');
            return;
        }
        setIssueActionLoading(paymentId); setIssueActionResult(null); setIssueActionError(null);
        const endpoint = `/api/admin/payments/${paymentId}/mark-failed`;
        try {
            const r = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message ?? `HTTP ${r.status}`);
            setIssueActionResult(`[${paymentId.slice(0, 8)}…] mark-failed: OK`);
            addAudit('POST mark-failed', endpoint, r.status, `reason=${reason}`);
            await loadIssues();
        } catch (e: any) {
            setIssueActionError(`[${paymentId.slice(0, 8)}…] mark-failed: ${e.message}`);
            addAudit('POST mark-failed', endpoint, 0, e.message);
        } finally { setIssueActionLoading(null); }
    }

    // ── Jobs tab ──────────────────────────────────────────────────────────────

    async function loadJobStatus(jobName: string) {
        setJobStatusLoading(prev => ({ ...prev, [jobName]: true }));
        const endpoint = `/api/admin/jobs/${jobName}/status`;
        try {
            const r = await fetch(endpoint);
            const d = r.status === 404 ? null : await r.json();
            setJobStatuses(prev => ({ ...prev, [jobName]: r.ok ? d : null }));
            addAudit(`GET job status`, endpoint, r.status);
        } catch (e: any) {
            addAudit(`GET job status`, endpoint, 0, e.message);
        } finally {
            setJobStatusLoading(prev => ({ ...prev, [jobName]: false }));
        }
    }

    async function runJob(jobName: string) {
        setJobRunLoading(prev => ({ ...prev, [jobName]: true }));
        setJobRunResult(null); setJobRunError(null);
        const endpoint = `/api/admin/jobs/${jobName}/run`;
        try {
            const r = await fetch(endpoint, { method: 'POST' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message ?? `HTTP ${r.status}`);
            setJobRunResult(`[${jobName}] run: ${JSON.stringify(d)}`);
            addAudit(`POST job run`, endpoint, r.status, JSON.stringify(d).slice(0, 100));
            await loadJobStatus(jobName);
        } catch (e: any) {
            setJobRunError(`[${jobName}] run: ${e.message}`);
            addAudit(`POST job run`, endpoint, 0, e.message);
        } finally {
            setJobRunLoading(prev => ({ ...prev, [jobName]: false }));
        }
    }

    useEffect(() => {
        if (authStep === 'authed' && activeTab === 'jobs') {
            KNOWN_JOBS.forEach(j => loadJobStatus(j));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStep, activeTab]);

    // ── Рендер ────────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 1000, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 6 }}>Admin Ops · Тестирование</h1>
            <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 28 }}>
                <a href="/test-ops" style={{ color: '#0070f3' }}>← Хаб</a>
                {' · '}Роль: <strong>ADMIN</strong>
                {' · '}Аккаунт: <code>admin@example.com</code>
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
                            {session.role !== 'ADMIN' && (
                                <span style={{ color: '#c00', marginLeft: 12 }}>
                                    ⚠ Роль {session.role} — нет доступа к admin-маршрутам
                                </span>
                            )}
                        </span>
                        <button onClick={handleLogout} style={btnSecondary}>Выйти</button>
                    </div>
                )}

                {(authStep === 'unauth' || authStep === 'code-sent') && (
                    <div>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 10 }}>
                            Admin: <code>admin@example.com</code>
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

            {/* ── Вкладки ── */}
            {authStep === 'authed' && (
                <>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '2px solid #ddd' }}>
                        {(['orders', 'payments', 'jobs', 'audit'] as Tab[]).map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} style={{
                                padding: '8px 18px', fontSize: 13, cursor: 'pointer',
                                border: 'none', borderBottom: activeTab === t ? '2px solid #0070f3' : '2px solid transparent',
                                background: activeTab === t ? '#f0f4ff' : '#f8f8f8',
                                color: activeTab === t ? '#0070f3' : '#444',
                                fontFamily: 'monospace', fontWeight: activeTab === t ? 700 : 400,
                                marginBottom: -2,
                            }}>
                                {t === 'orders'   && 'Orders'}
                                {t === 'payments' && 'Payment Issues'}
                                {t === 'jobs'     && 'Jobs'}
                                {t === 'audit'    && `Audit${auditLog.length > 0 ? ` (${auditLog.length})` : ''}`}
                            </button>
                        ))}
                    </div>

                    {/* ── Orders ── */}
                    {activeTab === 'orders' && (
                        <section style={{ ...sectionStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 }}>
                            <form onSubmit={handleOrdersFilter} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                <input placeholder="Статус" value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    style={{ ...inputStyle, width: 160 }} />
                                <input placeholder="Поиск (email / id)" value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                                <input type="date" placeholder="От" value={filterDateFrom}
                                    onChange={e => setFilterDateFrom(e.target.value)}
                                    style={{ ...inputStyle, width: 140 }} />
                                <input type="date" placeholder="До" value={filterDateTo}
                                    onChange={e => setFilterDateTo(e.target.value)}
                                    style={{ ...inputStyle, width: 140 }} />
                                <button type="submit" disabled={ordersLoading} style={btnPrimary}>
                                    {ordersLoading ? '...' : 'Применить'}
                                </button>
                                <button type="button" style={btnSecondary}
                                    onClick={() => { setFilterStatus(''); setFilterSearch(''); setFilterDateFrom(''); setFilterDateTo(''); loadOrders(); }}>
                                    Сброс
                                </button>
                            </form>

                            {ordersError && <p style={errInline}>{ordersError}</p>}
                            {ordersLoading && <p style={muted}>Загрузка...</p>}
                            {!ordersLoading && (
                                <>
                                    <p style={{ fontSize: 12, color: '#888', marginBottom: 10, marginTop: 0 }}>
                                        Найдено: {ordersTotal ?? orders.length} заказов
                                    </p>
                                    {orders.length === 0
                                        ? <p style={{ ...muted, marginBottom: 0 }}>Заказов не найдено</p>
                                        : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                                                        <th style={th}>ID</th>
                                                        <th style={th}>Статус</th>
                                                        <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                                                        <th style={th}>Пользователь</th>
                                                        <th style={{ ...th, textAlign: 'right' }}>Дата</th>
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
                                                            <td style={{ padding: '7px 8px', color: '#555', fontSize: 11 }}>
                                                                {o.userEmail ?? o.userId?.slice(0, 8) ?? '—'}
                                                            </td>
                                                            <td style={{ padding: '7px 0', textAlign: 'right', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                                                                {new Date(o.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                </>
                            )}
                        </section>
                    )}

                    {/* ── Payment Issues ── */}
                    {activeTab === 'payments' && (
                        <section style={{ ...sectionStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 }}>
                            <div style={sectionFlex}>
                                <h2 style={{ ...sHead, marginBottom: 0 }}>
                                    Проблемные оплаты
                                    {issues.length > 0 && <span style={badge}>{issues.length}</span>}
                                </h2>
                                <button onClick={loadIssues} disabled={issuesLoading} style={btnSecondary}>
                                    {issuesLoading ? '...' : 'Обновить'}
                                </button>
                            </div>
                            {issueActionResult && <div style={successBox}>{issueActionResult}</div>}
                            {issueActionError  && <div style={errorBox}>{issueActionError}</div>}
                            {issuesError && <p style={errInline}>{issuesError}</p>}
                            {issuesLoading && <p style={muted}>Загрузка...</p>}
                            {!issuesLoading && issues.length === 0 && !issuesError && (
                                <p style={{ ...muted, marginBottom: 0 }}>Проблемных оплат нет</p>
                            )}
                            {!issuesLoading && issues.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                                            <th style={th}>Payment ID</th>
                                            <th style={th}>Order ID</th>
                                            <th style={th}>Статус</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Сумма</th>
                                            <th style={{ ...th, textAlign: 'right' }}>Дата</th>
                                            <th style={th}>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map(p => (
                                            <tr key={p.paymentId} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px 8px 8px 0', color: '#666', fontSize: 11 }}>
                                                    {p.paymentId.slice(0, 8)}…
                                                </td>
                                                <td style={{ padding: '8px', color: '#666', fontSize: 11 }}>
                                                    {p.orderId.slice(0, 8)}…
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: p.status === 'FAILED' ? '#c00' : '#e07b00' }}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {(p.amount ?? 0).toLocaleString('ru')} ₽
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                                                    {new Date(p.createdAt).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '8px 0' }}>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => handleRetry(p.paymentId)}
                                                            disabled={issueActionLoading === p.paymentId}
                                                            style={{ ...btnSuccess, padding: '4px 10px', fontSize: 11 }}>
                                                            {issueActionLoading === p.paymentId ? '...' : 'Retry'}
                                                        </button>
                                                        <input
                                                            placeholder="reason (обязательно)"
                                                            value={markFailedReason[p.paymentId] ?? ''}
                                                            onChange={ev => setMarkFailedReason(prev => ({ ...prev, [p.paymentId]: ev.target.value }))}
                                                            style={{ ...inputStyle, width: 180, padding: '3px 6px', fontSize: 11 }}
                                                        />
                                                        <button
                                                            onClick={() => handleMarkFailed(p.paymentId)}
                                                            disabled={issueActionLoading === p.paymentId}
                                                            style={{ ...btnDanger, padding: '4px 10px', fontSize: 11 }}>
                                                            {issueActionLoading === p.paymentId ? '...' : 'Mark Failed'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    )}

                    {/* ── Jobs ── */}
                    {activeTab === 'jobs' && (
                        <section style={{ ...sectionStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 }}>
                            <h2 style={sHead}>Управление Job-ами</h2>
                            {jobRunResult && <div style={successBox}>{jobRunResult}</div>}
                            {jobRunError  && <div style={errorBox}>{jobRunError}</div>}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                                        <th style={th}>Job</th>
                                        <th style={th}>Последний запуск</th>
                                        <th style={th}>Статус</th>
                                        <th style={{ ...th, textAlign: 'right' }}>Длительность</th>
                                        <th style={th}>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {KNOWN_JOBS.map(jobName => {
                                        const s = jobStatuses[jobName];
                                        const loading = jobStatusLoading[jobName];
                                        return (
                                            <tr key={jobName} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px 8px 10px 0', fontWeight: 600 }}>
                                                    {jobName}
                                                </td>
                                                <td style={{ padding: '10px 8px', color: '#666', fontSize: 12 }}>
                                                    {loading ? '...' : s?.lastRunAt
                                                        ? new Date(s.lastRunAt).toLocaleString('ru')
                                                        : <span style={{ color: '#aaa' }}>не запускался</span>}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {loading ? '' : s?.lastStatus
                                                        ? <span style={{ fontWeight: 600, color: s.lastStatus === 'SUCCESS' ? '#0a9e5c' : '#c00' }}>
                                                            {s.lastStatus}
                                                        </span>
                                                        : <span style={{ color: '#aaa' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontSize: 12 }}>
                                                    {s?.lastDurationMs != null ? `${s.lastDurationMs} мс` : '—'}
                                                </td>
                                                <td style={{ padding: '10px 0' }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            onClick={() => loadJobStatus(jobName)}
                                                            disabled={!!jobStatusLoading[jobName]}
                                                            style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                                                            {jobStatusLoading[jobName] ? '...' : 'Status'}
                                                        </button>
                                                        <button
                                                            onClick={() => runJob(jobName)}
                                                            disabled={!!jobRunLoading[jobName]}
                                                            style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>
                                                            {jobRunLoading[jobName] ? '...' : '▶ Run'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* ── Audit ── */}
                    {activeTab === 'audit' && (
                        <section style={{ ...sectionStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 }}>
                            <div style={sectionFlex}>
                                <h2 style={{ ...sHead, marginBottom: 0 }}>
                                    Журнал операций
                                    <span style={{ marginLeft: 8, fontSize: 12, color: '#888', fontWeight: 400 }}>
                                        (клиентский лог всех API-вызовов на этой странице)
                                    </span>
                                </h2>
                                <button onClick={() => setAuditLog([])} style={{ ...btnSecondary, fontSize: 11, padding: '4px 10px' }}>
                                    Очистить
                                </button>
                            </div>
                            {auditLog.length === 0 && (
                                <p style={{ ...muted, marginBottom: 0 }}>
                                    Операций пока нет. Перейдите на другие вкладки и выполните действия.
                                </p>
                            )}
                            {auditLog.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                                            <th style={th}>Время</th>
                                            <th style={th}>Операция</th>
                                            <th style={th}>Endpoint</th>
                                            <th style={{ ...th, textAlign: 'center' }}>HTTP</th>
                                            <th style={th}>Детали</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map((e, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '6px 8px 6px 0', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                                                    {new Date(e.ts).toLocaleTimeString('ru')}
                                                </td>
                                                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{e.op}</td>
                                                <td style={{ padding: '6px 8px', color: '#0070f3', fontSize: 11, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {e.endpoint}
                                                </td>
                                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: e.status >= 200 && e.status < 300 ? '#0a9e5c' : '#c00' }}>
                                                    {e.status || '—'}
                                                </td>
                                                <td style={{ padding: '6px 0', color: '#555', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {e.details ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <p style={{ fontSize: 12, color: '#aaa', marginTop: 12, marginBottom: 0 }}>
                                Аудит-лог регистрирует все GET/POST запросы, выполненные в рамках этой сессии.
                                Обязательные поля: время, операция, endpoint, HTTP-статус.
                            </p>
                        </section>
                    )}
                </>
            )}
        </div>
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
    borderRadius: 4, padding: '8px 12px', marginBottom: 16,
};
const errorBox: React.CSSProperties = {
    fontSize: 13, color: '#c00', background: '#fee', border: '1px solid #fcc',
    borderRadius: 4, padding: '8px 12px', marginBottom: 16,
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
const btnDanger: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#e53e3e',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, background: '#f0f0f0',
    color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
};
