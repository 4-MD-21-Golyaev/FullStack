import { MoySkladGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';
import { OrderItem } from '@/domain/order/OrderItem';
import { MoySkladFolder, MoySkladProduct } from '@/domain/moysklad/MoySkladProduct';

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

/**
 * Build a MoySklad list URL with a single-field filter.
 *
 * MoySklad encodes the `=` operator inside the `filter` query-parameter value
 * as `%3D`, so `?filter=code%3Dvalue` means "code = value".
 */
function filterUrl(entityPath: string, field: string, value: string, limit = 1): string {
    return `${BASE_URL}/${entityPath}?filter=${field}%3D${encodeURIComponent(value)}&limit=${limit}`;
}

export class HttpMoySkladGateway implements MoySkladGateway {
    constructor(private config: {
        token: string;
        organizationId: string;
        agentId: string;
    }) {}

    async createCustomerOrder(orderId: string, items: OrderItem[], _totalAmount: number): Promise<string> {
        const desc = `Order #${orderId}`;

        // Idempotency: check if order already exists by description
        const existing = await this.findEntity('entity/customerorder', 'description', desc);
        if (existing) return existing;

        const positions = await this.resolvePositions(items);

        const body = {
            organization: this.orgMeta(),
            agent: this.agentMeta(),
            description: desc,
            positions,
        };

        const res = await fetch(`${BASE_URL}/entity/customerorder`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад createCustomerOrder failed: ${res.status} — ${errorBody}`);
        }

        const data = await res.json() as { id: string };
        return data.id;
    }

    async updateCustomerOrder(moySkladId: string, items: OrderItem[], _totalAmount: number): Promise<void> {
        const positions = await this.resolvePositions(items);

        const res = await fetch(`${BASE_URL}/entity/customerorder/${moySkladId}`, {
            method: 'PUT',
            headers: this.headers(),
            body: JSON.stringify({ positions }),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад updateCustomerOrder failed: ${res.status} — ${errorBody}`);
        }
    }

    async createPaymentIn(moySkladId: string, amount: number, orderId: string): Promise<void> {
        const desc = `Payment for Order #${orderId}`;

        // Idempotency
        const existing = await this.findEntity('entity/paymentin', 'description', desc);
        if (existing) return;

        const body = {
            organization: this.orgMeta(),
            agent: this.agentMeta(),
            description: desc,
            sum: Math.round(amount * 100),
            operations: [
                {
                    meta: {
                        href: `${BASE_URL}/entity/customerorder/${moySkladId}`,
                        type: 'customerorder',
                        mediaType: 'application/json',
                    },
                },
            ],
        };

        const res = await fetch(`${BASE_URL}/entity/paymentin`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад createPaymentIn failed: ${res.status} — ${errorBody}`);
        }
    }

    async updateCustomerOrderState(moySkladId: string): Promise<void> {
        const statesRes = await fetch(`${BASE_URL}/entity/customerorder/metadata`, { headers: this.headers() });
        if (!statesRes.ok) {
            throw new Error(`МойСклад: failed to fetch customerorder metadata: ${statesRes.status}`);
        }
        const metadata = await statesRes.json() as { states: { id: string; name: string; meta: { href: string } }[] };
        const shippedState = metadata.states?.find(s => s.name === 'Отгружен');
        if (!shippedState) {
            throw new Error('МойСклад: state "Отгружен" not found in customerorder metadata');
        }

        const res = await fetch(`${BASE_URL}/entity/customerorder/${moySkladId}`, {
            method: 'PUT',
            headers: this.headers(),
            body: JSON.stringify({
                state: {
                    meta: {
                        href: shippedState.meta.href,
                        type: 'state',
                        mediaType: 'application/json',
                    },
                },
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад updateCustomerOrderState failed: ${res.status} — ${errorBody}`);
        }
    }

    async fetchFolders(): Promise<MoySkladFolder[]> {
        const res = await fetch(`${BASE_URL}/entity/productfolder?limit=100`, { headers: this.headers() });
        if (!res.ok) throw new Error(`МойСклад fetchFolders failed: ${res.status}`);
        const data = await res.json() as { rows: any[] };
        return data.rows.map(r => ({
            id:       r.id as string,
            name:     r.name as string,
            parentId: r.productFolder?.meta?.href?.split('/').at(-1) ?? null,
        }));
    }

    async fetchProducts(): Promise<MoySkladProduct[]> {
        const res = await fetch(`${BASE_URL}/report/stock/all?expand=assortment&limit=1000`, { headers: this.headers() });
        if (!res.ok) throw new Error(`МойСклад fetchProducts failed: ${res.status}`);
        const data = await res.json() as { rows: any[] };
        return data.rows
            .filter(r => r.assortment?.code)
            .map(r => ({
                article:  r.assortment.code as string,
                name:     r.assortment.name as string,
                price:    ((r.assortment.salePrices?.[0]?.value ?? 0) / 100),
                stock:    Math.max(0, r.quantity ?? 0),
                folderId: r.assortment.productFolder?.meta?.href?.split('/').at(-1) ?? null,
            }));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async resolvePositions(items: OrderItem[]) {
        const missingArticles: string[] = [];
        const positions: { quantity: number; price: number; assortment: { meta: { href: string; type: string; mediaType: string } } }[] = [];

        for (const item of items) {
            const url = filterUrl('entity/product', 'code', item.article);
            const res = await fetch(url, { headers: this.headers() });

            if (!res.ok) {
                throw new Error(`МойСклад: поиск товара вернул ${res.status}`);
            }

            const data = await res.json() as { rows: { meta: { href: string } }[] };

            if (!data.rows || data.rows.length === 0) {
                missingArticles.push(item.article);
                continue;
            }

            positions.push({
                quantity: item.quantity,
                price: Math.round(item.price * 100),
                assortment: {
                    meta: {
                        href: data.rows[0].meta.href,
                        type: 'product',
                        mediaType: 'application/json',
                    },
                },
            });
        }

        if (missingArticles.length > 0) {
            throw new MoySkladProductNotFoundError(missingArticles);
        }

        return positions;
    }

    /**
     * Search for an entity by a single field. Returns the id if found, null otherwise.
     */
    private async findEntity(entityPath: string, field: string, value: string): Promise<string | null> {
        const url = filterUrl(entityPath, field, value);
        const res = await fetch(url, { headers: this.headers() });
        if (!res.ok) return null;
        const data = await res.json() as { rows: { id: string }[] };
        return data.rows?.length ? data.rows[0].id : null;
    }

    private orgMeta() {
        return {
            meta: {
                href: `${BASE_URL}/entity/organization/${this.config.organizationId}`,
                type: 'organization',
                mediaType: 'application/json',
            },
        };
    }

    private agentMeta() {
        return {
            meta: {
                href: `${BASE_URL}/entity/counterparty/${this.config.agentId}`,
                type: 'counterparty',
                mediaType: 'application/json',
            },
        };
    }

    private headers(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
        };
    }
}
