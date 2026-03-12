import { AuditLog } from '@/domain/audit/AuditLog';

export interface AuditLogRepository {
    save(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
}
