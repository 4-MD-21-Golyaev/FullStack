export interface OtpRepository {
    create(email: string, code: string, expiresAt: Date): Promise<void>;
    verify(email: string, code: string): Promise<boolean>;
}
