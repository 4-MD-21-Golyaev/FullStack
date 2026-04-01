import { type NextRequest, NextResponse } from 'next/server';
import { DeleteUserAddressUseCase } from '@/application/user/DeleteUserAddressUseCase';
import { PrismaUserAddressRepository } from '@/infrastructure/repositories/UserAddressRepository.prisma';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await new DeleteUserAddressUseCase(new PrismaUserAddressRepository()).execute({ id, userId });

        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.message === 'Address not found') {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }
        if (error.message === 'Forbidden') {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
