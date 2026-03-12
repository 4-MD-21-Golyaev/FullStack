export enum OrderState {
    CREATED           = 'CREATED',
    PICKING           = 'PICKING',
    PAYMENT           = 'PAYMENT',
    /** @deprecated Legacy — kept for backward-compat with existing DB records only. */
    DELIVERY          = 'DELIVERY',
    DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
    OUT_FOR_DELIVERY  = 'OUT_FOR_DELIVERY',
    DELIVERED         = 'DELIVERED',
    CLOSED            = 'CLOSED',
    CANCELLED         = 'CANCELLED',
}
