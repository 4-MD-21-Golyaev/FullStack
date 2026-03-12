import { JobRunLog } from '@/domain/jobs/JobRunLog';

export interface JobRunLogRepository {
    start(jobName: string, initiatedBy?: string): Promise<string>; // returns id
    finish(id: string, result: { processed?: number; failed?: number; errorSummary?: string }): Promise<void>;
    fail(id: string, errorSummary: string): Promise<void>;
    findLatest(jobName: string): Promise<JobRunLog | null>;
}
