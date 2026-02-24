import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_MAX_AGE = 15 * 60;           // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setTokenCookies(res: NextResponse, accessToken: string, refreshToken: string): void {
    const secure = process.env.NODE_ENV === 'production';

    res.cookies.set(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: ACCESS_MAX_AGE,
        path: '/',
    });

    res.cookies.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: REFRESH_MAX_AGE,
        path: '/api/auth',
    });
}

export function clearTokenCookies(res: NextResponse): void {
    const secure = process.env.NODE_ENV === 'production';

    res.cookies.set(ACCESS_COOKIE, '', {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });

    res.cookies.set(REFRESH_COOKIE, '', {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: 0,
        path: '/api/auth',
    });
}

export function getAccessToken(req: NextRequest): string | null {
    return req.cookies.get(ACCESS_COOKIE)?.value ?? null;
}

export function getRefreshToken(req: NextRequest): string | null {
    return req.cookies.get(REFRESH_COOKIE)?.value ?? null;
}
