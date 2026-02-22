import { OrderItem } from '@/domain/order/OrderItem';

/** Бросается когда хотя бы один товар из заказа не найден в МойСклад по артикулу. */
export class MoySkladProductNotFoundError extends Error {
    constructor(public readonly missingArticles: string[]) {
        super(`МойСклад: товары не найдены по артикулам: ${missingArticles.join(', ')}`);
        this.name = 'MoySkladProductNotFoundError';
    }
}

export interface MoySkladGateway {
    // Export (п.3)
    exportOrder(orderId: string, items: OrderItem[]): Promise<void>;

    // Import (п.4) — добавит SyncProductsUseCase позже
    // fetchFolders(): Promise<MoySkladFolder[]>;
    // fetchProducts(): Promise<MoySkladProduct[]>;
}
