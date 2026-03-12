export interface AuditLog {
    id: string;
    actorUserId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    correlationId: string;
    timestamp: Date;
}
