import { NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prismaClient';

export async function GET() {
    const statuses = await prisma.orderStatus.findMany({
        select: { code: true, name: true },
    });
    return NextResponse.json(statuses);
}
