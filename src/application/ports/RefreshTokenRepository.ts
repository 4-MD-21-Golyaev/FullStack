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
    revoke(id: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
}
