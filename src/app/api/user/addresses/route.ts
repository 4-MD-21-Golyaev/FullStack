import { type NextRequest, NextResponse } from 'next/server';
import { GetUserAddressesUseCase } from '@/application/user/GetUserAddressesUseCase';
import { SaveUserAddressUseCase } from '@/application/user/SaveUserAddressUseCase';
import { PrismaUserAddressRepository } from '@/infrastructure/repositories/UserAddressRepository.prisma';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await new GetUserAddressesUseCase(new PrismaUserAddressRepository()).execute({ userId });
    return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const saved = await new SaveUserAddressUseCase(new PrismaUserAddressRepository()).execute({
            userId,
            address: body.address,
        });

        return NextResponse.json(saved, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
