import { apiClient } from './client';
import type { JobRunStatus } from '@/domain/jobs/JobRunLog';

export type JobName = 'payment-timeout' | 'process-outbox' | 'sync-products';

export interface JobStatusResponse {
  jobName: string;
  status: JobRunStatus | null;
  startedAt: string | null;
  finishedAt: string | null;
  processed: number | null;
  failed: number | null;
  errorSummary: string | null;
  durationMs: number | null;
}

export const jobsApi = {
  getStatus: (jobName: JobName) =>
    apiClient.get<JobStatusResponse>(`/api/admin/jobs/${jobName}/status`),

  run: (jobName: JobName) =>
    apiClient.post<JobStatusResponse>(`/api/admin/jobs/${jobName}/run`),
};
