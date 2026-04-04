import { type NextRequest, NextResponse } from 'next/server';
import { PrismaFavoriteRepository } from '@/infrastructure/repositories/FavoriteRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { GetFavoritesUseCase } from '@/application/favorites/GetFavoritesUseCase';
import { AddToFavoritesUseCase } from '@/application/favorites/AddToFavoritesUseCase';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const useCase = new GetFavoritesUseCase(
        new PrismaFavoriteRepository(),
        new PrismaProductRepository(),
    );
    const items = await useCase.execute(userId);
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const productId = body?.productId;
        if (!productId || typeof productId !== 'string') {
            return NextResponse.json({ message: 'Invalid productId' }, { status: 400 });
        }

        const useCase = new AddToFavoritesUseCase(
            new PrismaFavoriteRepository(),
            new PrismaProductRepository(),
        );
        await useCase.execute({ userId, productId });
        return NextResponse.json({ message: 'Added to favorites' }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
