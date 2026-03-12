'use client';

import { useState } from 'react';

interface SyncResult {
    created: number;
    updated: number;
    hidden: number;
    categoriesProcessed: number;
}

interface WebhookResponse {
    ok: boolean;
    result?: SyncResult;
    error?: string;
}

/** Симулированный payload вебхука МойСклад — такой же формат, как присылает реальный сервис */
const MOCK_WEBHOOK_PAYLOAD = {
    auditContext: {
        uid: 'mock-simulation',
        moment: new Date().toISOString(),
    },
    events: [
        { meta: { type: 'product' }, action: 'UPDATE' },
    ],
};

export default function MoySkladAdminPage() {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<WebhookResponse | null>(null);
    const [firedAt, setFiredAt] = useState<string | null>(null);

    async function handleSimulate() {
        setLoading(true);
        setResponse(null);
        try {
            const res = await fetch('/api/webhooks/moysklad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(MOCK_WEBHOOK_PAYLOAD),
            });
            const data: WebhookResponse = await res.json();
            setResponse(data);
            if (data.ok) setFiredAt(new Date().toLocaleString('ru-RU'));
        } catch {
            setResponse({ ok: false, error: 'Сетевая ошибка' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: 620, margin: '40px auto', padding: '0 16px' }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>МойСклад — симуляция вебхука</h1>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
                В production МойСклад автоматически присылает уведомление при изменении ассортимента.
                Так как тестовая подписка недоступна, эта страница симулирует входящий вебхук вручную.
            </p>

            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, marginBottom: 8 }}>Что происходит при нажатии кнопки</h2>
                <ol style={{ fontSize: 13, color: '#444', paddingLeft: 20, lineHeight: 1.8, margin: '0 0 16px' }}>
                    <li>Браузер отправляет <code>POST /api/webhooks/moysklad</code> с mock-payload</li>
                    <li>Сервер запрашивает актуальные папки и товары у МойСклад API</li>
                    <li>Синхронизирует локальную БД (создаёт, обновляет, скрывает)</li>
                </ol>
                <button
                    onClick={handleSimulate}
                    disabled={loading}
                    style={{
                        background: loading ? '#999' : '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '10px 20px',
                        fontSize: 14,
                        cursor: loading ? 'default' : 'pointer',
                    }}
                >
                    {loading ? 'Синхронизация...' : 'Симулировать вебхук МойСклад'}
                </button>
                {firedAt && (
                    <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
                        Последний запуск: {firedAt}
                    </p>
                )}
            </div>

            {response && (
                <div style={{
                    borderRadius: 8,
                    padding: 20,
                    background: response.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${response.ok ? '#86efac' : '#fca5a5'}`,
                }}>
                    {response.ok && response.result ? (
                        <>
                            <h3 style={{ marginBottom: 12, color: '#166534', fontSize: 15 }}>
                                Синхронизация завершена
                            </h3>
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                                <tbody>
                                    {[
                                        ['Создано товаров',           response.result.created],
                                        ['Обновлено товаров',         response.result.updated],
                                        ['Скрыто (нет в МойСклад)',   response.result.hidden],
                                        ['Обработано категорий',      response.result.categoriesProcessed],
                                    ].map(([label, value]) => (
                                        <tr key={label as string}>
                                            <td style={{ padding: '4px 0', color: '#555' }}>{label}</td>
                                            <td style={{ padding: '4px 0', fontWeight: 600 }}>{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: 8, color: '#991b1b', fontSize: 15 }}>Ошибка</h3>
                            <p style={{ fontSize: 13, color: '#7f1d1d' }}>{response.error}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
