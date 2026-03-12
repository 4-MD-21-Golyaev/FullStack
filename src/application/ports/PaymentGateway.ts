export interface CreatePaymentParams {
    internalPaymentId: string; // наш UUID — используется как idempotency key
    orderId: string;
    amount: number;            // в рублях (дробное число, например 99.99)
    description: string;
    returnUrl: string;
}

export interface CreatedPayment {
    externalId: string;        // ID платежа в системе ЮKassa
    confirmationUrl: string;   // URL для редиректа пользователя
}

export interface RefundParams {
    externalId: string;       // Yookassa payment ID to refund
    amount: number;           // amount in rubles
    idempotencyKey: string;   // caller-assigned idempotency key
}

export interface PaymentGateway {
    createPayment(params: CreatePaymentParams): Promise<CreatedPayment>;
    refundPayment(params: RefundParams): Promise<void>;
}
