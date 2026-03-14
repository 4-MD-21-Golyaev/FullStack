import { OrderItem } from '@/domain/order/OrderItem';

/** Бросается когда хотя бы один товар из заказа не найден в МойСклад по артикулу. */
export class MoySkladProductNotFoundError extends Error {
    constructor(public readonly missingArticles: string[]) {
        super(`МойСклад: товары не найдены по артикулам: ${missingArticles.join(', ')}`);
        this.name = 'MoySkladProductNotFoundError';
    }
}

export interface MoySkladOrderGateway {
    createCustomerOrder(orderId: string, items: OrderItem[], totalAmount: number): Promise<string>;
    updateCustomerOrder(moySkladId: string, items: OrderItem[], totalAmount: number): Promise<void>;
    createPaymentIn(moySkladId: string, amount: number, orderId: string): Promise<void>;
    updateCustomerOrderState(moySkladId: string): Promise<void>;
}
