export class PaymentAlreadyInProgressError extends Error {
    constructor() {
        super('Payment already in progress for this order');
        this.name = 'PaymentAlreadyInProgressError';
    }
}
