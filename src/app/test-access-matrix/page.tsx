'use client';

import { useState, useEffect } from 'react';

// ── Типы ──────────────────────────────────────────────────────────────────────

type AuthStep = 'checking' | 'unauth' | 'code-sent' | 'authed';
type Role = 'CUSTOMER' | 'PICKER' | 'COURIER' | 'ADMIN';

interface Session {
    userId: string;
    email: string;
    role: string;
}

interface ProbeResult {
    endpoint: string;
    status: number;
    expected: number;
    ok: boolean;
}

// ── Матрица доступа ───────────────────────────────────────────────────────────
// Формат: [endpoint, description, { CUSTOMER, PICKER, COURIER, ADMIN }]
// true = 2xx, false = 403/401

type AccessRow = {
    method: string;
    endpoint: string;
    description: string;
    access: Record<Role, boolean>;
    probeGet?: boolean; // можно проверить GET-запросом без данных
};

const ACCESS_MATRIX: AccessRow[] = [
    // Общие (любая аутентифицированная роль)
    { method: 'GET',  endpoint: '/api/auth/me',                    description: 'Текущий пользователь', access: { CUSTOMER: true, PICKER: true, COURIER: true, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/order-statuses',              description: 'Справочник статусов',  access: { CUSTOMER: true, PICKER: true, COURIER: true, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/user-roles',                  description: 'Список ролей',          access: { CUSTOMER: true, PICKER: true, COURIER: true, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/orders',                      description: 'Мои заказы',            access: { CUSTOMER: true, PICKER: true, COURIER: true, ADMIN: true }, probeGet: true },
    // Picker
    { method: 'GET',  endpoint: '/api/picker/orders/available',     description: 'Picker: доступные',     access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/picker/orders/me',            description: 'Picker: мои заказы',    access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true }, probeGet: true },
    { method: 'POST', endpoint: '/api/picker/orders/{id}/claim',    description: 'Picker: claim',          access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true } },
    { method: 'POST', endpoint: '/api/picker/orders/{id}/release',  description: 'Picker: release',        access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true } },
    { method: 'POST', endpoint: '/api/orders/{id}/start-picking',   description: 'Picker: start-picking',  access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true } },
    { method: 'POST', endpoint: '/api/orders/{id}/complete-picking',description: 'Picker: complete',       access: { CUSTOMER: false, PICKER: true, COURIER: false, ADMIN: true } },
    // Courier
    { method: 'GET',  endpoint: '/api/courier/orders/available',    description: 'Courier: доступные',    access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/courier/orders/me',           description: 'Courier: мои доставки', access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true }, probeGet: true },
    { method: 'POST', endpoint: '/api/courier/orders/{id}/claim',   description: 'Courier: claim',         access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true } },
    { method: 'POST', endpoint: '/api/courier/orders/{id}/release', description: 'Courier: release',       access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true } },
    { method: 'POST', endpoint: '/api/courier/orders/{id}/start-delivery',    description: 'Courier: start-delivery',    access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true } },
    { method: 'POST', endpoint: '/api/courier/orders/{id}/confirm-delivered', description: 'Courier: confirm-delivered', access: { CUSTOMER: false, PICKER: false, COURIER: true, ADMIN: true } },
    // Admin
    { method: 'GET',  endpoint: '/api/admin/orders',                description: 'Admin: реестр заказов', access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true }, probeGet: true },
    { method: 'GET',  endpoint: '/api/admin/payments/issues',       description: 'Admin: проблемные оплаты', access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true }, probeGet: true },
    { method: 'POST', endpoint: '/api/admin/payments/{id}/retry',   description: 'Admin: retry payment',   access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true } },
    { method: 'POST', endpoint: '/api/admin/payments/{id}/mark-failed', description: 'Admin: mark-failed', access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true } },
    { method: 'GET',  endpoint: '/api/admin/jobs/{name}/status',    description: 'Admin: job status',      access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true } },
    { method: 'POST', endpoint: '/api/admin/jobs/{name}/run',       description: 'Admin: job run',         access: { CUSTOMER: false, PICKER: false, COURIER: false, ADMIN: true } },
];

const ROLES: Role[] = ['CUSTOMER', 'PICKER', 'COURIER', 'ADMIN'];

// Probeable GET endpoints (не требуют параметра ID)
const PROBE_ENDPOINTS = ACCESS_MATRIX.filter(r => r.probeGet).map(r => r.endpoint);

// ── Компонент ─────────────────────────────────────────────────────────────────

export default function TestAccessMatrixPage() {

    // Аутентификация
    const [authStep, setAuthStep]       = useState<AuthStep>('checking');
    const [session, setSession]         = useState<Session | null>(null);
    const [authEmail, setAuthEmail]     = useState('');
    const [authCode, setAuthCode]       = useState('');
    const [authError, setAuthError]     = useState<string | null>(null);
    const [devCode, setDevCode]         = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);

    // Проверка доступа
    const [probeLoading, setProbeLoading] = useState(false);
    const [probeResults, setProbeResults] = useState<ProbeResult[]>([]);

    // Проверка отсутствия STAFF в /api/user-roles
    const [staffCheckResult, setStaffCheckResult] = useState<string | null>(null);
    const [staffCheckLoading, setStaffCheckLoading] = useState(false);

    // ── Инициализация ─────────────────────────────────────────────────────────

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) { setSession(d); setAuthStep('authed'); } else setAuthStep('unauth'); })
            .catch(() => setAuthStep('unauth'));
    }, []);

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
        setProbeResults([]); setStaffCheckResult(null);
        setAuthEmail(''); setAuthCode('');
    }

    // ── Probe ─────────────────────────────────────────────────────────────────

    async function runProbe() {
        if (!session) return;
        setProbeLoading(true); setProbeResults([]);
        const role = session.role as Role;
        const results: ProbeResult[] = [];

        for (const ep of PROBE_ENDPOINTS) {
            const row = ACCESS_MATRIX.find(r => r.endpoint === ep)!;
            const expected = row.access[role] ? 200 : 403;
            try {
                const r = await fetch(ep);
                const actual = r.status;
                results.push({
                    endpoint: ep,
                    status: actual,
                    expected,
                    ok: (actual >= 200 && actual < 300) === row.access[role],
                });
            } catch {
                results.push({ endpoint: ep, status: 0, expected, ok: false });
            }
        }
        setProbeResults(results);
        setProbeLoading(false);
    }

    async function checkStaffAbsence() {
        setStaffCheckLoading(true); setStaffCheckResult(null);
        try {
            const r = await fetch('/api/user-roles');
            if (!r.ok) { setStaffCheckResult(`HTTP ${r.status}: не удалось получить роли`); return; }
            const roles: { code: string; name: string }[] = await r.json();
            const hasStaff = roles.some(x => x.code === 'STAFF');
            if (hasStaff) {
                setStaffCheckResult('FAIL: роль STAFF присутствует в /api/user-roles — необходимо исключить');
            } else {
                setStaffCheckResult('OK: роль STAFF отсутствует в /api/user-roles');
            }
        } catch (e: any) {
            setStaffCheckResult(`Ошибка: ${e.message}`);
        } finally {
            setStaffCheckLoading(false);
        }
    }

    // ── Рендер ────────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 40, maxWidth: 1000, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 6 }}>Матрица доступа · Тестирование</h1>
            <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 28 }}>
                <a href="/test-ops" style={{ color: '#0070f3' }}>← Хаб</a>
                {' · '}Роли: CUSTOMER, PICKER, COURIER, ADMIN
                {' · '}Роль STAFF исключена
            </p>

            {/* ── Статическая матрица ── */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Ожидаемая матрица доступа</h2>
                <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 12 }}>
                    ✓ = доступ разрешён · ✗ = 403 Forbidden
                    {' · '}Роль <strong>STAFF</strong> отсутствует
                </p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ddd' }}>
                                <th style={{ ...th, width: 60 }}>Метод</th>
                                <th style={th}>Endpoint</th>
                                <th style={th}>Описание</th>
                                {ROLES.map(r => (
                                    <th key={r} style={{ ...th, textAlign: 'center', color: roleColor(r), width: 90 }}>{r}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ACCESS_MATRIX.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '6px 8px 6px 0', fontWeight: 600, color: row.method === 'GET' ? '#0070f3' : '#7b3fbf', fontSize: 11 }}>
                                        {row.method}
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 11, color: '#333' }}>
                                        {row.endpoint}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: '#666', fontSize: 11 }}>
                                        {row.description}
                                    </td>
                                    {ROLES.map(role => (
                                        <td key={role} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 14 }}>
                                            {row.access[role]
                                                ? <span style={{ color: '#0a9e5c' }}>✓</span>
                                                : <span style={{ color: '#c00' }}>✗</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Аутентификация для проверки ── */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Аутентификация для Live Probe</h2>

                {authStep === 'checking' && <p style={muted}>Проверка сессии...</p>}

                {authStep === 'authed' && session && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 13 }}>
                            Вошли как <strong>{session.email}</strong>
                            {' · '}
                            <span style={{ color: roleColor(session.role), fontWeight: 700 }}>{session.role}</span>
                        </span>
                        <button onClick={handleLogout} style={btnSecondary}>Выйти</button>
                    </div>
                )}

                {(authStep === 'unauth' || authStep === 'code-sent') && (
                    <div>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 10 }}>
                            Войдите под нужной ролью для проверки:
                            {' '}<code>test@example.com</code> (CUSTOMER)
                            {' · '}<code>picker@example.com</code> (PICKER)
                            {' · '}<code>courier@example.com</code> (COURIER)
                            {' · '}<code>admin@example.com</code> (ADMIN)
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

            {/* ── Live Probe ── */}
            {authStep === 'authed' && session && (
                <section style={sectionStyle}>
                    <div style={sectionFlex}>
                        <h2 style={{ ...sHead, marginBottom: 0 }}>
                            Live Probe — роль <span style={{ color: roleColor(session.role) }}>{session.role}</span>
                        </h2>
                        <button onClick={runProbe} disabled={probeLoading} style={btnPrimary}>
                            {probeLoading ? 'Проверка...' : '▶ Запустить проверку'}
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: 14 }}>
                        Проверяются только GET-эндпоинты без параметров. POST-эндпоинты с ID проверяйте вручную.
                    </p>

                    {probeResults.length > 0 && (
                        <>
                            <div style={{ marginBottom: 12, fontSize: 13 }}>
                                <span style={{ color: '#0a9e5c', marginRight: 16 }}>
                                    ✓ {probeResults.filter(r => r.ok).length} совпадений
                                </span>
                                <span style={{ color: probeResults.some(r => !r.ok) ? '#c00' : '#888' }}>
                                    {probeResults.some(r => !r.ok)
                                        ? `✗ ${probeResults.filter(r => !r.ok).length} расхождений`
                                        : 'Все ожидания совпадают'}
                                </span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                                        <th style={th}>Endpoint</th>
                                        <th style={{ ...th, textAlign: 'center' }}>Ожидаемо</th>
                                        <th style={{ ...th, textAlign: 'center' }}>Фактически</th>
                                        <th style={{ ...th, textAlign: 'center' }}>Результат</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {probeResults.map((r, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #eee', background: r.ok ? 'transparent' : '#fff5f5' }}>
                                            <td style={{ padding: '7px 8px 7px 0', fontSize: 11 }}>{r.endpoint}</td>
                                            <td style={{ padding: '7px 8px', textAlign: 'center', color: '#666' }}>
                                                {r.expected}
                                            </td>
                                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700,
                                                color: r.status >= 200 && r.status < 300 ? '#0a9e5c' : '#c00' }}>
                                                {r.status || '—'}
                                            </td>
                                            <td style={{ padding: '7px 0', textAlign: 'center', fontSize: 14 }}>
                                                {r.ok
                                                    ? <span style={{ color: '#0a9e5c' }}>✓</span>
                                                    : <span style={{ color: '#c00' }}>✗ РАСХОЖДЕНИЕ</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </section>
            )}

            {/* ── Контроль отсутствия STAFF ── */}
            <section style={sectionStyle}>
                <div style={sectionFlex}>
                    <h2 style={{ ...sHead, marginBottom: 0 }}>Контроль отсутствия STAFF</h2>
                    <button onClick={checkStaffAbsence} disabled={staffCheckLoading || authStep !== 'authed'} style={btnSecondary}>
                        {staffCheckLoading ? '...' : 'Проверить /api/user-roles'}
                    </button>
                </div>
                <p style={{ fontSize: 12, color: '#666', marginTop: 0, marginBottom: staffCheckResult ? 10 : 0 }}>
                    Проверяет, что <code>STAFF</code> отсутствует в ответе <code>GET /api/user-roles</code>.
                    {authStep !== 'authed' && ' Требуется авторизация.'}
                </p>
                {staffCheckResult && (
                    <div style={staffCheckResult.startsWith('OK') ? successBox : errorBox}>
                        {staffCheckResult}
                    </div>
                )}
            </section>
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
const devCodeBox: React.CSSProperties = {
    fontSize: 13, background: '#fffbe6', border: '1px solid #f0c040',
    borderRadius: 4, padding: '6px 10px', marginTop: 8, marginBottom: 0,
};
const successBox: React.CSSProperties = {
    fontSize: 13, color: '#0a9e5c', background: '#f0fff4', border: '1px solid #b7ebc5',
    borderRadius: 4, padding: '8px 12px', marginBottom: 0,
};
const errorBox: React.CSSProperties = {
    fontSize: 13, color: '#c00', background: '#fee', border: '1px solid #fcc',
    borderRadius: 4, padding: '8px 12px', marginBottom: 0,
};
const inputStyle: React.CSSProperties = {
    padding: '8px 10px', fontSize: 14, fontFamily: 'monospace',
    border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', fontSize: 13, background: '#0070f3',
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, background: '#f0f0f0',
    color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer',
};
