export class PaymentAlreadyInProgressError extends Error {
    constructor() {
        super('Payment already in progress for this order');
        this.name = 'PaymentAlreadyInProgressError';
    }
}

export class PaymentWindowExpiredError extends Error {
    constructor() {
        super('Payment window has expired for this order');
        this.name = 'PaymentWindowExpiredError';
    }
}
