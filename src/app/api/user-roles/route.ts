import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prismaClient';

export async function GET() {
    const roles = await prisma.userRole.findMany({
        select: { code: true, name: true },
    });
    return NextResponse.json(roles);
}
