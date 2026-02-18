export interface OrderItem {
    productId: string;
    name: string;
    article: string;
    price: number;      // фиксируется при создании заказа
    quantity: number;
}
