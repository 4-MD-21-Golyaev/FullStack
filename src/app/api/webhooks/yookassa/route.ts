import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { ConfirmPaymentUseCase } from '@/application/order/ConfirmPaymentUseCase';
import { isYookassaIp, getClientIp } from '@/infrastructure/payment/yookassaIpWhitelist';

const HANDLED_EVENTS = new Set(['payment.succeeded', 'payment.canceled']);

export async function POST(req: NextRequest) {
    // Проверка IP — разрешаем только серверы ЮKassa
    // В development пропускаем проверку для локального тестирования
    if (process.env.NODE_ENV === 'production') {
        const clientIp = getClientIp(req);

        if (!clientIp || !isYookassaIp(clientIp)) {
            return NextResponse.json(
                { message: 'Forbidden' },
                { status: 403 }
            );
        }
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const event = body?.event;
    const paymentObject = body?.object;

    if (!HANDLED_EVENTS.has(event) || !paymentObject?.id) {
        // Неизвестное событие — принимаем и игнорируем
        return NextResponse.json({ ok: true });
    }

    try {
        const orderRepo = new PrismaOrderRepository();
        const paymentRepo = new PrismaPaymentRepository();
        const productRepo = new PrismaProductRepository();

        const useCase = new ConfirmPaymentUseCase(orderRepo, paymentRepo, productRepo);

        await useCase.execute({
            externalId: paymentObject.id,
            event,
        });

        // Всегда возвращаем 200 — иначе ЮKassa будет повторять вебхук
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        // Логируем ошибку, но всё равно возвращаем 200,
        // чтобы ЮKassa не заваливала нас повторными запросами
        console.error('[yookassa webhook]', error.message);
        return NextResponse.json({ ok: true });
    }
}
