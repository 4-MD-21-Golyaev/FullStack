export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {

        const cron = await import('node-cron');
        const { PaymentTimeoutUseCase } = await import('@/application/order/PaymentTimeoutUseCase');
        const { PrismaPaymentRepository } = await import('@/infrastructure/repositories/PaymentRepository.prisma');
        const { PrismaTransactionRunner } = await import('@/infrastructure/db/PrismaTransactionRunner');

        if (!(global as { __cronStarted?: boolean }).__cronStarted) {
            (global as { __cronStarted?: boolean }).__cronStarted = true;

            cron.schedule('* * * * *', async () => {

                const useCase = new PaymentTimeoutUseCase(
                    new PrismaPaymentRepository(),
                    new PrismaTransactionRunner(),
                );
                const result = await useCase.execute();
                console.log('[cron] payment-timeout result:', result);
            });
        }
    }
}
