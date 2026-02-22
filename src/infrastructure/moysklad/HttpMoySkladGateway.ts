import { MoySkladGateway, MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';
import { OrderItem } from '@/domain/order/OrderItem';

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

export class HttpMoySkladGateway implements MoySkladGateway {
    constructor(private config: {
        token: string;
        organizationId: string;
        agentId: string;
    }) {}

    async exportOrder(orderId: string, items: OrderItem[]): Promise<void> {
        const missingArticles: string[] = [];
        const positions: { quantity: number; price: number; assortment: { meta: { href: string; type: string; mediaType: string } } }[] = [];

        for (const item of items) {
            const url = `${BASE_URL}/entity/product?filter=code%3D${encodeURIComponent(item.article)}&limit=1`;
            const res = await fetch(url, { headers: this.headers() });

            if (!res.ok) {
                throw new Error(`МойСклад exportOrder: поиск товара вернул ${res.status}`);
            }

            const data = await res.json() as { rows: { meta: { href: string } }[] };

            if (!data.rows || data.rows.length === 0) {
                missingArticles.push(item.article);
                continue;
            }

            positions.push({
                quantity: item.quantity,
                price: item.price * 100, // рубли → копейки
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

        const body = {
            organization: {
                meta: {
                    href: `${BASE_URL}/entity/organization/${this.config.organizationId}`,
                    type: 'organization',
                    mediaType: 'application/json',
                },
            },
            agent: {
                meta: {
                    href: `${BASE_URL}/entity/counterparty/${this.config.agentId}`,
                    type: 'counterparty',
                    mediaType: 'application/json',
                },
            },
            description: `Order #${orderId}`,
            positions,
        };

        const res = await fetch(`${BASE_URL}/entity/customerorder`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`МойСклад exportOrder failed: ${res.status}`);
        }
    }

    private headers(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
        };
    }
}
