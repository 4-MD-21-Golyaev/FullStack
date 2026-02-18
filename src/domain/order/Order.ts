import { OrderState } from './OrderState';
import { OrderItem } from './OrderItem';

export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    state: OrderState;
    address: string;
    createdAt: Date;
    updatedAt: Date;
}

