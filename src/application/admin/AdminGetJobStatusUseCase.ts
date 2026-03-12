import { JobRunLogRepository } from '@/application/ports/JobRunLogRepository';
import { JobRunLog } from '@/domain/jobs/JobRunLog';

interface AdminGetJobStatusInput {
    jobName: string;
}

export class AdminGetJobStatusUseCase {
    constructor(private jobRunLogRepository: JobRunLogRepository) {}

    async execute(input: AdminGetJobStatusInput): Promise<JobRunLog | null> {
        return this.jobRunLogRepository.findLatest(input.jobName);
    }
}
