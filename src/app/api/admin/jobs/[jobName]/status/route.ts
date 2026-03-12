import { NextRequest, NextResponse } from 'next/server';
import { AdminGetJobStatusUseCase } from '@/application/admin/AdminGetJobStatusUseCase';
import { PrismaJobRunLogRepository } from '@/infrastructure/repositories/JobRunLogRepository.prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ jobName: string }> }
) {
    const { jobName } = await params;
    try {
        const useCase = new AdminGetJobStatusUseCase(new PrismaJobRunLogRepository());
        const status = await useCase.execute({ jobName });
        if (!status) {
            return NextResponse.json({ message: 'No runs found for this job' }, { status: 404 });
        }
        return NextResponse.json(status);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
