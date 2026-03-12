import { NextRequest, NextResponse } from 'next/server';
import { AdminRunJobUseCase } from '@/application/admin/AdminRunJobUseCase';
import { PrismaJobRunLogRepository } from '@/infrastructure/repositories/JobRunLogRepository.prisma';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ jobName: string }> }
) {
    const { jobName } = await params;
    const actorUserId = req.headers.get('x-user-id') ?? '';

    const internalJobSecret = process.env.INTERNAL_JOB_SECRET;
    if (!internalJobSecret) {
        return NextResponse.json({ message: 'INTERNAL_JOB_SECRET is not configured' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.YOOKASSA_RETURN_URL ?? 'http://localhost:3000';

    try {
        const useCase = new AdminRunJobUseCase(new PrismaJobRunLogRepository());
        const result = await useCase.execute({
            jobName,
            actorUserId,
            internalJobSecret,
            baseUrl,
        });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
