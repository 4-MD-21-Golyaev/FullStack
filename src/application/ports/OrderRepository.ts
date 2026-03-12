import { Order } from '@/domain/order/Order';

export interface AdminOrderFilters {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string; // matches id, email (via join), phone (via join)
    limit?: number;
    offset?: number;
}

export interface AdminOrderRow extends Order {
    userEmail?: string;
    userPhone?: string;
    timeInState: number; // seconds in current state
    isPaymentOverdue: boolean;
    hasPendingPayment: boolean;
}

export interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string): Promise<Order[]>;
    findStaleInPayment(olderThan: Date): Promise<Order[]>;

    // Admin registry
    findAllWithFilters(filters: AdminOrderFilters): Promise<AdminOrderRow[]>;
    countWithFilters(filters: Omit<AdminOrderFilters, 'limit' | 'offset'>): Promise<number>;

    // Picker queue
    findAvailableForPicking(): Promise<Order[]>;
    findByPickerClaimUserId(userId: string): Promise<Order[]>;
    /** Atomic claim: sets pickerClaimUserId if currently null and status in CREATED/PICKING.
     *  Returns true on success, false on conflict. */
    claimForPicker(orderId: string, userId: string): Promise<boolean>;
    /** Release picker claim. If requireUserId is provided, only releases if current claimer matches. */
    releasePickerClaim(orderId: string, requireUserId?: string): Promise<boolean>;

    // Courier queue
    findAvailableForDelivery(): Promise<Order[]>;
    findByCourierClaimUserId(userId: string): Promise<Order[]>;
    /** Atomic claim: sets deliveryClaimUserId if currently null and status is DELIVERY. */
    claimForCourier(orderId: string, userId: string): Promise<boolean>;
    /** Release courier claim. If requireUserId is provided, only releases if current claimer matches. */
    releaseCourierClaim(orderId: string, requireUserId?: string): Promise<boolean>;
}
