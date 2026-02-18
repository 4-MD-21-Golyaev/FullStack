'use client';

import { useState } from 'react';

export default function TestOrderPage() {

    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                        userId: "test-user",
                        address: "Address",
                        items: [
                            {
                                productId: "p1",
                                quantity: 2
                            }
                        ]
                    }
                )
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unknown error');
            }

            setResult(data);

        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <div style={{ padding: 40 }}>
            <h1>Test Order Creation</h1>

            <button onClick={handleSubmit}>
                Create Order
            </button>

            {error && (
                <pre style={{ color: 'red' }}>
          {error}
        </pre>
            )}

            {result && (
                <pre>
          {JSON.stringify(result, null, 2)}
        </pre>
            )}
        </div>
    );
}
