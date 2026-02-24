import { NextRequest, NextResponse } from 'next/server';
import { GetMeUseCase } from '@/application/auth/GetMeUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/UserRepository.prisma';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const useCase = new GetMeUseCase(new PrismaUserRepository());
    const user = await useCase.execute({ userId });

    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ userId: user.id, email: user.email, role: user.role });
}
