import { NextRequest, NextResponse } from 'next/server';
import { PrismaCartRepository } from '@/infrastructure/repositories/CartRepository.prisma';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { SyncCartUseCase } from '@/application/cart/SyncCartUseCase';
import { GetCartUseCase } from '@/application/cart/GetCartUseCase';

// Синхронизация корзины при авторизации.
// Если у пользователя была непустая локальная корзина — она заменяет DB-корзину.
// Если локальная корзина пустая — DB-корзина остаётся как есть (items: []).
// Возвращает актуальное состояние DB-корзины с деталями товаров.
export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const items: { productId: string; quantity: number }[] = body.items ?? [];

        if (items.length > 0) {
            await new SyncCartUseCase(
                new PrismaCartRepository(),
                new PrismaProductRepository(),
            ).execute({ userId, items });
        }

        const cart = await new GetCartUseCase(
            new PrismaCartRepository(),
            new PrismaProductRepository(),
        ).execute(userId);

        return NextResponse.json(cart);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
