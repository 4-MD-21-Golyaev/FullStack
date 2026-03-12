export interface RefreshTokenRecord {
    id: string;
    userId: string;
    revoked: boolean;
    expiresAt: Date;
    createdAt: Date;
}

export interface RefreshTokenRepository {
    save(token: RefreshTokenRecord): Promise<void>;
    findById(id: string): Promise<RefreshTokenRecord | null>;
    /**
     * Atomically marks the token as revoked and returns it.
     * Returns null if the token is not found, already revoked, or expired.
     * This prevents the TOCTOU race in refresh token rotation.
     */
    consumeActive(id: string, now: Date): Promise<RefreshTokenRecord | null>;
    revoke(id: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
}
