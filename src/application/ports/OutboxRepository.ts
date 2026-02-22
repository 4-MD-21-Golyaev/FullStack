export interface OutboxEvent {
    id: string;
    eventType: string;
    payload: unknown;
    createdAt: Date;
    processedAt: Date | null;
    failedAt: Date | null;
    errorMessage: string | null;
    retryCount: number;
}

export interface OutboxRepository {
    save(event: Omit<OutboxEvent, 'createdAt' | 'processedAt' | 'failedAt' | 'errorMessage' | 'retryCount'>): Promise<void>;
    findPending(maxRetries: number): Promise<OutboxEvent[]>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string, errorMessage: string): Promise<void>;
    incrementRetry(id: string): Promise<void>;
}
