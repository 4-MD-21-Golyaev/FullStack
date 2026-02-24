import { SignJWT, jwtVerify } from 'jose';
import { TokenService, AccessTokenPayload, RefreshTokenPayload } from '@/application/ports/TokenService';

export class JoseTokenService implements TokenService {
    private secret: Uint8Array;

    constructor() {
        const s = process.env.JWT_SECRET;
        if (!s) throw new Error('JWT_SECRET is not defined');
        this.secret = new TextEncoder().encode(s);
    }

    async signAccessToken(payload: AccessTokenPayload): Promise<string> {
        return new SignJWT({ role: payload.role, email: payload.email })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(payload.sub)
            .setIssuedAt()
            .setExpirationTime('15m')
            .sign(this.secret);
    }

    async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
        return new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(payload.sub)
            .setJti(payload.jti)
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(this.secret);
    }

    async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
        try {
            const { payload } = await jwtVerify(token, this.secret);
            return {
                sub: payload.sub as string,
                role: payload['role'] as string,
                email: payload['email'] as string,
            };
        } catch {
            return null;
        }
    }

    async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
        try {
            const { payload } = await jwtVerify(token, this.secret);
            return {
                sub: payload.sub as string,
                jti: payload.jti as string,
            };
        } catch {
            return null;
        }
    }
}
