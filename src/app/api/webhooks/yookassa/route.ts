import { NextRequest, NextResponse } from 'next/server';
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PaymentRepository.prisma';
import { PrismaTransactionRunner } from '@/infrastructure/db/PrismaTransactionRunner';
import { ConfirmPaymentUseCase } from '@/application/order/ConfirmPaymentUseCase';
import { YookassaGateway } from '@/infrastructure/payment/YookassaGateway';
import { isYookassaIp, getClientIp } from '@/infrastructure/payment/yookassaIpWhitelist';

const HANDLED_EVENTS = new Set(['payment.succeeded', 'payment.canceled']);

/**
 * Prisma errors carry a string `code` like "P2002". Any error with such a code,
 * or with a known Prisma error name, is considered an infrastructure failure
 * that YooKassa should retry by re-sending the webhook.
 */
function isRetryableError(error: any): boolean {
    if (typeof error?.code === 'string' && /^P\d/.test(error.code)) return true;
    if (error?.name === 'PrismaClientInitializationError') return true;
    if (error?.name === 'PrismaClientRustPanicError') return true;
    if (error?.name === 'PrismaClientUnknownRequestError') return true;
    return false;
}

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
        const useCase = new ConfirmPaymentUseCase(
            new PrismaPaymentRepository(),
            new PrismaTransactionRunner(),
            new YookassaGateway(),
        );

        await useCase.execute({
            externalId: paymentObject.id,
            event,
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        if (isRetryableError(error)) {
            // Инфраструктурная ошибка (БД, транзакция) — 5xx сигнализирует ЮKassa о повторе
            console.error('[yookassa webhook] retryable error, will retry', {
                externalId: paymentObject.id,
                event,
                error: error.message,
            });
            return NextResponse.json({ ok: false, error: 'Service unavailable' }, { status: 503 });
        }

        // Доменная ошибка (не найден платёж, нет остатков и т.д.) — возвращаем 200,
        // чтобы ЮKassa не повторяла заведомо необработываемое событие.
        console.warn('[yookassa webhook] non-retryable error', {
            externalId: paymentObject.id,
            event,
            error: error.message,
        });
        return NextResponse.json({ ok: true });
    }
}
