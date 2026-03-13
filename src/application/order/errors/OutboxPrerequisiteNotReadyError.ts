export class OutboxPrerequisiteNotReadyError extends Error {
    constructor(eventType: string, reason: string) {
        super(`Prerequisite not ready for ${eventType}: ${reason}`);
        this.name = 'OutboxPrerequisiteNotReadyError';
    }
}
