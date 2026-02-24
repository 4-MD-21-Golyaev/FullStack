import { NextRequest, NextResponse } from 'next/server';
import { RegisterUseCase } from '@/application/auth/RegisterUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/UserRepository.prisma';
import { UserAlreadyExistsError } from '@/domain/auth/errors';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, phone, address } = body;

        if (!email || !phone) {
            return NextResponse.json({ message: 'email and phone are required' }, { status: 400 });
        }

        const useCase = new RegisterUseCase(new PrismaUserRepository());
        const result = await useCase.execute({ email, phone, address });

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof UserAlreadyExistsError) {
            return NextResponse.json({ message: error.message }, { status: 409 });
        }
        return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
}
