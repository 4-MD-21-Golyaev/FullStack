import { JobRunLogRepository } from '@/application/ports/JobRunLogRepository';

export type AdminJobName = 'payment-timeout' | 'process-outbox' | 'sync-products';

const KNOWN_JOBS: AdminJobName[] = ['payment-timeout', 'process-outbox', 'sync-products'];

interface AdminRunJobInput {
    jobName: string;
    actorUserId: string;
    internalJobSecret: string;
    baseUrl: string;
}

interface AdminRunJobResult {
    jobName: string;
    runId: string;
    status: string;
    result?: unknown;
}

export class AdminRunJobUseCase {
    constructor(private jobRunLogRepository: JobRunLogRepository) {}

    async execute(input: AdminRunJobInput): Promise<AdminRunJobResult> {
        if (!KNOWN_JOBS.includes(input.jobName as AdminJobName)) {
            throw new Error(`Unknown job: ${input.jobName}. Known jobs: ${KNOWN_JOBS.join(', ')}`);
        }

        const runId = await this.jobRunLogRepository.start(input.jobName, input.actorUserId);

        const jobUrl = this.resolveJobUrl(input.jobName, input.baseUrl);

        let result: unknown;
        try {
            const response = await fetch(jobUrl, {
                method: 'GET',
                headers: { Authorization: `Bearer ${input.internalJobSecret}` },
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Job responded with ${response.status}: ${body}`);
            }

            result = await response.json();
            await this.jobRunLogRepository.finish(runId, {
                processed: (result as any)?.result?.processed,
                failed: (result as any)?.result?.failed,
            });
        } catch (e: any) {
            await this.jobRunLogRepository.fail(runId, e.message ?? 'Unknown error');
            throw e;
        }

        return { jobName: input.jobName, runId, status: 'SUCCESS', result };
    }

    private resolveJobUrl(jobName: AdminJobName | string, baseUrl: string): string {
        const base = baseUrl.replace(/\/$/, '');
        switch (jobName) {
            case 'payment-timeout':
                return `${base}/api/internal/jobs/payment-timeout`;
            case 'process-outbox':
                return `${base}/api/internal/jobs/process-outbox`;
            case 'sync-products':
                return `${base}/api/internal/jobs/sync-products`;
            default:
                throw new Error(`No URL mapping for job: ${jobName}`);
        }
    }
}
