import {
    PaymentGateway,
    CreatePaymentParams,
    CreatedPayment,
} from '@/application/ports/PaymentGateway';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YookassaGateway implements PaymentGateway {

    private readonly auth: string;

    constructor() {
        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;

        if (!shopId || !secretKey) {
            throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set');
        }

        this.auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    }

    async createPayment(params: CreatePaymentParams): Promise<CreatedPayment> {
        const rubles = params.amount.toFixed(2);

        const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Content-Type': 'application/json',
                'Idempotence-Key': params.internalPaymentId,
            },
            body: JSON.stringify({
                amount: {
                    value: rubles,
                    currency: 'RUB',
                },
                confirmation: {
                    type: 'redirect',
                    return_url: params.returnUrl,
                },
                capture: true,
                description: params.description,
                metadata: {
                    orderId: params.orderId,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(
                `ЮKassa API error ${response.status}: ${JSON.stringify(error)}`
            );
        }

        const data = await response.json();

        return {
            externalId: data.id,
            confirmationUrl: data.confirmation.confirmation_url,
        };
    }
}
