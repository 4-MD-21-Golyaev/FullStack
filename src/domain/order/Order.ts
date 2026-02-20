import { OrderState } from './OrderState';
import { OrderItem } from './OrderItem';
import { AbsenceResolutionStrategy } from './AbsenceResolutionStrategy';

export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    state: OrderState;
    address: string;
    absenceResolutionStrategy: AbsenceResolutionStrategy;
    createdAt: Date;
    updatedAt: Date;
}

