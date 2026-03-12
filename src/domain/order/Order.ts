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
    pickerClaimUserId?: string | null;
    pickerClaimedAt?: Date | null;
    deliveryClaimUserId?: string | null;
    deliveryClaimedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

