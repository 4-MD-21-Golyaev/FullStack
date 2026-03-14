import { MoySkladCatalogGateway } from '@/application/ports/MoySkladCatalogGateway';
import { MoySkladOrderGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladOrderGateway';
import { OrderItem } from '@/domain/order/OrderItem';
import { MoySkladFolder, MoySkladProduct, MoySkladStockItem } from '@/domain/moysklad/MoySkladProduct';

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';
const PAGE_LIMIT = 100;

// ── Shared helpers ──────────────────────────────────────────────────────────

interface MoySkladConfig {
    token: string;
    organizationId: string;
    agentId: string;
}

function headers(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/** Extract entity UUID from a MoySklad meta href, stripping query params. */
function extractIdFromHref(href: string | undefined): string {
    if (!href) return '';
    const lastSegment = href.split('/').at(-1) ?? '';
    return lastSegment.split('?')[0];
}

/**
 * Build a MoySklad list URL with a single-field filter.
 *
 * MoySklad encodes the `=` operator inside the `filter` query-parameter value
 * as `%3D`, so `?filter=code%3Dvalue` means "code = value".
 */
function filterUrl(entityPath: string, field: string, value: string, limit = 1): string {
    return `${BASE_URL}/${entityPath}?filter=${field}%3D${encodeURIComponent(value)}&limit=${limit}`;
}

/** Paginate through a MoySklad list endpoint, collecting all rows. */
async function fetchAllPaginated<T>(
    url: string,
    token: string,
    mapRow: (row: any) => T,
    limit = PAGE_LIMIT,
): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    while (true) {
        const separator = url.includes('?') ? '&' : '?';
        const pageUrl = `${url}${separator}limit=${limit}&offset=${offset}`;
        const res = await fetch(pageUrl, { headers: headers(token) });
        if (!res.ok) throw new Error(`МойСклад fetch failed: ${res.status} — ${pageUrl}`);
        const data = await res.json() as { rows: any[]; meta: { size: number } };
        for (const row of data.rows) {
            results.push(mapRow(row));
        }
        offset += data.rows.length;
        if (offset >= data.meta.size || data.rows.length === 0) break;
    }

    return results;
}

// ── Catalog Gateway (import) ────────────────────────────────────────────────

export class HttpMoySkladCatalogGateway implements MoySkladCatalogGateway {
    constructor(private config: MoySkladConfig) {}

    async fetchFolders(): Promise<MoySkladFolder[]> {
        return fetchAllPaginated(
            `${BASE_URL}/entity/productfolder`,
            this.config.token,
            (r) => ({
                id:       r.id as string,
                name:     r.name as string,
                parentId: extractIdFromHref(r.productFolder?.meta?.href) || null,
            }),
        );
    }

    async fetchProducts(): Promise<MoySkladProduct[]> {
        return fetchAllPaginated(
            `${BASE_URL}/entity/product`,
            this.config.token,
            (r) => ({
                id:        r.id as string,
                article:   (r.code ?? r.article ?? '') as string,
                name:      r.name as string,
                price:     ((r.salePrices?.[0]?.value ?? 0) / 100),
                folderId:  extractIdFromHref(r.productFolder?.meta?.href) || null,
                hasImages: (r.images?.meta?.size ?? 0) > 0,
            }),
        );
    }

    async fetchStock(): Promise<MoySkladStockItem[]> {
        return fetchAllPaginated(
            `${BASE_URL}/report/stock/all`,
            this.config.token,
            (r) => ({
                article: (r.code ?? '') as string,
                stock:   Math.max(0, r.quantity ?? 0),
            }),
            1000, // stock report supports larger pages
        );
    }

    async fetchProductImage(productId: string): Promise<{ bytes: Buffer; filename: string } | null> {
        const url = `${BASE_URL}/entity/product/${productId}/images?limit=1`;
        const listRes = await fetch(url, { headers: headers(this.config.token) });
        if (!listRes.ok) {
            const body = await listRes.text().catch(() => '');
            console.warn(`[MoySklad] fetchProductImage list failed: ${listRes.status} url=${url} body=${body}`);
            return null;
        }
        const data = await listRes.json() as { rows: any[] };
        if (!data.rows?.length) return null;

        const row = data.rows[0];
        const filename: string = row.filename ?? row.title ?? 'image.jpg';
        const downloadHref: string | undefined = row.meta?.downloadHref ?? row.miniature?.downloadHref;
        if (!downloadHref) {
            console.warn(`[MoySklad] fetchProductImage: no downloadHref in row keys=[${Object.keys(row)}] for productId=${productId}`);
            return null;
        }

        const imgRes = await fetch(downloadHref, {
            headers: { 'Authorization': `Bearer ${this.config.token}` },
        });
        if (!imgRes.ok) {
            console.warn(`[MoySklad] fetchProductImage download failed: ${imgRes.status} href=${downloadHref} for productId=${productId}`);
            return null;
        }

        const bytes = Buffer.from(await imgRes.arrayBuffer());
        return { bytes, filename };
    }
}

// ── Order Gateway (export) ──────────────────────────────────────────────────

export class HttpMoySkladOrderGateway implements MoySkladOrderGateway {
    constructor(private config: MoySkladConfig) {}

    async createCustomerOrder(orderId: string, items: OrderItem[], _totalAmount: number): Promise<string> {
        const desc = `Order #${orderId}`;

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
            headers: headers(this.config.token),
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
            headers: headers(this.config.token),
            body: JSON.stringify({ positions }),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад updateCustomerOrder failed: ${res.status} — ${errorBody}`);
        }
    }

    async createPaymentIn(moySkladId: string, amount: number, orderId: string): Promise<void> {
        const desc = `Payment for Order #${orderId}`;

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
            headers: headers(this.config.token),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => '');
            throw new Error(`МойСклад createPaymentIn failed: ${res.status} — ${errorBody}`);
        }
    }

    async updateCustomerOrderState(moySkladId: string): Promise<void> {
        const statesRes = await fetch(`${BASE_URL}/entity/customerorder/metadata`, { headers: headers(this.config.token) });
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
            headers: headers(this.config.token),
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

    // ── Private helpers ─────────────────────────────────────────────────────

    private async resolvePositions(items: OrderItem[]) {
        const missingArticles: string[] = [];
        const positions: { quantity: number; price: number; assortment: { meta: { href: string; type: string; mediaType: string } } }[] = [];

        for (const item of items) {
            const url = filterUrl('entity/product', 'code', item.article);
            const res = await fetch(url, { headers: headers(this.config.token) });

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

    private async findEntity(entityPath: string, field: string, value: string): Promise<string | null> {
        const url = filterUrl(entityPath, field, value);
        const res = await fetch(url, { headers: headers(this.config.token) });
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
}
