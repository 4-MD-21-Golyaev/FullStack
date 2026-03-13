'use client';

// ── Типы ─────────────────────────────────────────────────────────────────────

// ── Компонент ─────────────────────────────────────────────────────────────────

export default function TestOpsPage() {
    return (
        <div style={{ padding: 40, maxWidth: 760, fontFamily: 'monospace' }}>
            <h1 style={{ marginBottom: 6 }}>Операционный хаб · Тестирование</h1>
            <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 28 }}>
                Ручная приёмка операционных сценариев
            </p>

            <div style={warnBox}>
                <strong>Роль STAFF не поддерживается.</strong>{' '}
                В сценариях, матрице доступа и тестовых аккаунтах присутствуют только:{' '}
                <code>CUSTOMER</code>, <code>PICKER</code>, <code>COURIER</code>, <code>ADMIN</code>.
            </div>

            {/* Тестовые аккаунты */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Тестовые аккаунты</h2>
                <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={th}>Email</th>
                            <th style={th}>Роль</th>
                            <th style={th}>Описание</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['test@example.com',    'CUSTOMER', 'Покупатель — заказы, корзина, оплата'],
                            ['picker@example.com',  'PICKER',   'Сборщик — claim/release заказов, сборка'],
                            ['courier@example.com', 'COURIER',  'Курьер — claim/release доставок, статусы'],
                            ['admin@example.com',   'ADMIN',    'Администратор — полный операционный доступ'],
                        ].map(([email, role, desc]) => (
                            <tr key={email} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '7px 16px 7px 0', color: '#0070f3' }}>
                                    <code>{email}</code>
                                </td>
                                <td style={{ padding: '7px 16px', fontWeight: 700, color: roleColor(role), whiteSpace: 'nowrap' }}>
                                    {role}
                                </td>
                                <td style={{ padding: '7px 0', color: '#555', fontSize: 12 }}>{desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 0, marginTop: 10 }}>
                    Аккаунт <code>staff@example.com</code> (STAFF) исключён из всех тестовых сценариев.
                </p>
            </section>

            {/* Ссылки на сценарии */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Сценарии</h2>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={th}>Страница</th>
                            <th style={th}>Роли</th>
                            <th style={th}>Описание</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['/test-picker',        'PICKER, ADMIN',         'Сборка заказов: available, claim, release, start-picking, complete-picking'],
                            ['/test-courier',       'COURIER, ADMIN',        'Доставка: available, claim, release, start-delivery, confirm-delivered, mark-failed'],
                            ['/test-admin-ops',     'ADMIN',                 'Реестр заказов, проблемные оплаты, job-запуск, аудит'],
                            ['/test-access-matrix', 'Все 4 роли',            'Матрица доступа — ожидаемый и фактический статус по ролям'],
                            ['/test-order',         'CUSTOMER',              'Создание заказа, оплата (существующая страница)'],
                            ['/test-cabinet',       'CUSTOMER',              'Личный кабинет, история заказов (существующая страница)'],
                        ].map(([path, roles, desc]) => (
                            <tr key={path} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px 16px 8px 0', whiteSpace: 'nowrap' }}>
                                    <a href={path} style={{ color: '#0070f3' }}>{path}</a>
                                </td>
                                <td style={{ padding: '8px 16px', color: '#666', fontSize: 12, whiteSpace: 'nowrap' }}>{roles}</td>
                                <td style={{ padding: '8px 0', color: '#444', fontSize: 12 }}>{desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Чек-лист инвариантов */}
            <section style={sectionStyle}>
                <h2 style={sHead}>Чек-лист инвариантов</h2>
                <ol style={{ fontSize: 13, margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                    <li><code>CUSTOMER</code> изолирован от <code>/api/admin/*</code>, <code>/api/picker/*</code>, <code>/api/courier/*</code></li>
                    <li><code>PICKER</code> проходит полный picking-сценарий без courier/admin-прав</li>
                    <li><code>COURIER</code> проходит claim/release доставки без picker/admin-прав</li>
                    <li><code>ADMIN</code> имеет полный операционный доступ: реестр, оплаты, job, аудит</li>
                    <li>Конкурентный claim: один успешный, второй → <code>409</code></li>
                    <li>Аудит фиксирует все критичные действия и неуспешные попытки</li>
                    <li>Роль <code>STAFF</code> отсутствует во всех тестовых сценариях, экранах и матрице</li>
                </ol>
            </section>
        </div>
    );
}

// ── Вспомогательные функции ────────────────────────────────────────────────────

function roleColor(role: string) {
    if (role === 'ADMIN')   return '#c00';
    if (role === 'PICKER')  return '#e07b00';
    if (role === 'COURIER') return '#7b3fbf';
    return '#0a9e5c'; // CUSTOMER
}

// ── Стили ──────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
    marginBottom: 28, padding: 16, background: '#f8f8f8', borderRadius: 6, border: '1px solid #ddd',
};
const sHead: React.CSSProperties = { fontSize: 15, marginBottom: 12, marginTop: 0 };
const th: React.CSSProperties = { textAlign: 'left', padding: '4px 16px 8px 0', fontWeight: 600, color: '#444', fontSize: 12 };
const warnBox: React.CSSProperties = {
    background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 4,
    padding: '10px 14px', marginBottom: 28, fontSize: 13,
};
