export interface EmailGateway {
    sendOtp(to: string, code: string): Promise<void>;
    sendOrderConfirmed(to: string, orderId: string, totalAmount: number): Promise<void>;
    sendOrderOutForDelivery(to: string, orderId: string): Promise<void>;
    sendOrderDelivered(to: string, orderId: string): Promise<void>;
    sendOrderReadyForPayment(to: string, orderId: string, totalAmount: number): Promise<void>;
}
