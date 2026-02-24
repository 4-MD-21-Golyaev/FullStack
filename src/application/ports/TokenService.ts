export interface AccessTokenPayload {
    sub: string;
    role: string;
    email: string;
}

export interface RefreshTokenPayload {
    sub: string;
    jti: string;
}

export interface TokenService {
    signAccessToken(payload: AccessTokenPayload): Promise<string>;
    signRefreshToken(payload: RefreshTokenPayload): Promise<string>;
    verifyAccessToken(token: string): Promise<AccessTokenPayload | null>;
    verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
}
