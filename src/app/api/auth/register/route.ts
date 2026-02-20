import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prismaClient';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, phone, address } = body;

        if (!email || !phone) {
            return NextResponse.json({ message: 'email and phone are required' }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }

        const user = await prisma.user.create({
            data: { email, phone, address: address ?? null, role: 'CUSTOMER' },
        });

        return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
