export type JobRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface JobRunLog {
    id: string;
    jobName: string;
    startedAt: Date;
    finishedAt?: Date | null;
    status: JobRunStatus;
    initiatedBy?: string | null;
    processed?: number | null;
    failed?: number | null;
    errorSummary?: string | null;
}
