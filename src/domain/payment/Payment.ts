import { PaymentStatus } from './PaymentStatus';

export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    status: PaymentStatus;
    externalId?: string;
    createdAt: Date;
}
