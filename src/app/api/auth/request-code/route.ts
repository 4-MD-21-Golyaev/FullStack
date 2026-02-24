import { NextRequest, NextResponse } from 'next/server';
import { RequestCodeUseCase } from '@/application/auth/RequestCodeUseCase';
import { PrismaOtpRepository } from '@/infrastructure/repositories/OtpRepository.prisma';
import { NodemailerEmailGateway } from '@/infrastructure/auth/NodemailerEmailGateway';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ message: 'email is required' }, { status: 400 });
        }

        const useCase = new RequestCodeUseCase(
            new PrismaOtpRepository(),
            new NodemailerEmailGateway(),
        );
        const result = await useCase.execute({ email });

        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
}
