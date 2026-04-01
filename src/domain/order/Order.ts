import { type OrderState } from './OrderState';
import { type OrderItem } from './OrderItem';
import { type AbsenceResolutionStrategy } from './AbsenceResolutionStrategy';

export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalAmount: number;
    state: OrderState;
    address: string;
    absenceResolutionStrategy: AbsenceResolutionStrategy;
    customerPhone?: string | null;
    pickerClaimUserId?: string | null;
    pickerClaimedAt?: Date | null;
    deliveryClaimUserId?: string | null;
    deliveryClaimedAt?: Date | null;
    outForDeliveryAt?: Date | null;
    deliveredAt?: Date | null;
    moySkladId?: string | null;
    scheduledDate?: Date | null;
    scheduledTimeSlot?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

