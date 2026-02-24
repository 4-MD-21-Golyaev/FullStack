import { jwtVerify } from 'jose';

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
