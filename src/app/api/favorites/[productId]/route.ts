import { type NextRequest, NextResponse } from 'next/server';
import { PrismaFavoriteRepository } from '@/infrastructure/repositories/FavoriteRepository.prisma';
import { RemoveFromFavoritesUseCase } from '@/application/favorites/RemoveFromFavoritesUseCase';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const { productId } = await params;
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const useCase = new RemoveFromFavoritesUseCase(new PrismaFavoriteRepository());
        await useCase.execute({ userId, productId });
        return NextResponse.json({ message: 'Favorite removed' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
