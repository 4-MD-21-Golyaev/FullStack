import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prismaClient';

export async function GET() {
    const strategies = await prisma.absenceResolutionStrategy.findMany({
        select: { code: true, name: true },
    });
    return NextResponse.json(strategies);
}
