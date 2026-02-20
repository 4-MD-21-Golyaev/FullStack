import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
    sub: string;
    role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
    email: string;
}

function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return new TextEncoder().encode(secret);
}

export async function signJwt(payload: SessionPayload): Promise<string> {
    return new SignJWT({ role: payload.role, email: payload.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            sub: payload.sub as string,
            role: payload['role'] as 'CUSTOMER' | 'STAFF' | 'ADMIN',
            email: payload['email'] as string,
        };
    } catch {
        return null;
    }
}
