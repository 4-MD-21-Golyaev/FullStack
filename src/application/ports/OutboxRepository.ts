export interface OutboxEvent {
    id: string;
    eventType: string;
    payload: unknown;
    createdAt: Date;
    processedAt: Date | null;
    failedAt: Date | null;
    errorMessage: string | null;
    retryCount: number;
    claimedAt: Date | null;
}

export interface OutboxRepository {
    save(event: Omit<OutboxEvent, 'createdAt' | 'processedAt' | 'failedAt' | 'errorMessage' | 'retryCount' | 'claimedAt'>): Promise<void>;
    /**
     * Atomically claims up to a batch of pending events using FOR UPDATE SKIP LOCKED.
     * Also releases stale claims (claimedAt older than staleAfter) before claiming.
     * Returns only the events successfully claimed by this worker.
     */
    claimPending(maxRetries: number, now: Date, staleAfter: Date): Promise<OutboxEvent[]>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string, errorMessage: string): Promise<void>;
    /** Increments retry counter and releases the claim so the event can be re-claimed later. */
    incrementRetry(id: string): Promise<void>;
}
