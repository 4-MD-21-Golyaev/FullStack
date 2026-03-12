import { PrismaClient } from '@prisma/client';
import { JobRunLogRepository } from '@/application/ports/JobRunLogRepository';
import { JobRunLog } from '@/domain/jobs/JobRunLog';
import { prisma } from '../db/prismaClient';

export class PrismaJobRunLogRepository implements JobRunLogRepository {
    private db: PrismaClient;

    constructor(db?: PrismaClient) {
        this.db = db ?? prisma;
    }

    async start(jobName: string, initiatedBy?: string): Promise<string> {
        const record = await this.db.jobRunLog.create({
            data: {
                jobName,
                startedAt: new Date(),
                status: 'RUNNING',
                initiatedBy: initiatedBy ?? null,
            },
        });
        return record.id;
    }

    async finish(id: string, result: { processed?: number; failed?: number; errorSummary?: string }): Promise<void> {
        await this.db.jobRunLog.update({
            where: { id },
            data: {
                finishedAt: new Date(),
                status: 'SUCCESS',
                processed: result.processed ?? null,
                failed: result.failed ?? null,
                errorSummary: result.errorSummary ?? null,
            },
        });
    }

    async fail(id: string, errorSummary: string): Promise<void> {
        await this.db.jobRunLog.update({
            where: { id },
            data: {
                finishedAt: new Date(),
                status: 'FAILED',
                errorSummary,
            },
        });
    }

    async findLatest(jobName: string): Promise<JobRunLog | null> {
        const record = await this.db.jobRunLog.findFirst({
            where: { jobName },
            orderBy: { startedAt: 'desc' },
        });

        if (!record) return null;

        return {
            id: record.id,
            jobName: record.jobName,
            startedAt: record.startedAt,
            finishedAt: record.finishedAt,
            status: record.status as JobRunLog['status'],
            initiatedBy: record.initiatedBy,
            processed: record.processed,
            failed: record.failed,
            errorSummary: record.errorSummary,
        };
    }
}
