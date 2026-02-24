export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {

        const cron = await import('node-cron');
        const { PaymentTimeoutUseCase } = await import('@/application/order/PaymentTimeoutUseCase');
        const { ProcessOutboxUseCase } = await import('@/application/order/ProcessOutboxUseCase');
        const { PrismaPaymentRepository } = await import('@/infrastructure/repositories/PaymentRepository.prisma');
        const { PrismaOutboxRepository } = await import('@/infrastructure/repositories/OutboxRepository.prisma');
        const { PrismaTransactionRunner } = await import('@/infrastructure/db/PrismaTransactionRunner');
        const { HttpMoySkladGateway } = await import('@/infrastructure/moysklad/HttpMoySkladGateway');

        if (!(global as { __cronStarted?: boolean }).__cronStarted) {
            (global as { __cronStarted?: boolean }).__cronStarted = true;

            cron.schedule('* * * * *', async () => {
                try {
                    const useCase = new PaymentTimeoutUseCase(
                        new PrismaPaymentRepository(),
                        new PrismaTransactionRunner(),
                    );
                    const result = await useCase.execute();

                    console.log('[PaymentTimeout]', result);
                } catch (err) {
                    console.error('[PaymentTimeout] cron error', err);
                }
            });

            cron.schedule('* * * * *', async () => {

                const useCase = new ProcessOutboxUseCase(
                    new PrismaOutboxRepository(),
                    new HttpMoySkladGateway({
                        token:          process.env.MOYSKLAD_TOKEN!,
                        organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
                        agentId:        process.env.MOYSKLAD_AGENT_ID!,
                    }),
                );
                await useCase.execute();
            });
        }
    }
}
