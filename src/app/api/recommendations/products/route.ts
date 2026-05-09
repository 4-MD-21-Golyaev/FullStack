import { type NextRequest, NextResponse } from 'next/server';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { PrismaProductRecommendationRepository } from '@/infrastructure/repositories/ProductRecommendationRepository.prisma';
import { GetGlobalPopularProductsUseCase } from '@/application/recommendation/GetGlobalPopularProductsUseCase';
import { GetUserPopularProductsUseCase } from '@/application/recommendation/GetUserPopularProductsUseCase';
import { collectDescendantIds } from '@/domain/category/utils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const categoryId = searchParams.get('categoryId');
        const parsedLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
        const limit = Math.min(isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit, MAX_LIMIT);

        const userId = req.headers.get('x-user-id');

        const productRepo = new PrismaProductRepository();
        const categoryRepo = new PrismaCategoryRepository();
        const recRepo = new PrismaProductRecommendationRepository();
        const globalUseCase = new GetGlobalPopularProductsUseCase(recRepo);

        let popular;
        let personalized = false;
        let fallbackUsed = false;

        if (userId) {
            const userUseCase = new GetUserPopularProductsUseCase(recRepo, categoryRepo, globalUseCase);
            const result = await userUseCase.execute(userId, categoryId, limit);
            popular = result.items;
            personalized = result.personalized;
            fallbackUsed = result.fallbackUsed;
        } else {
            const categoryIds = await expandCategoryIds(categoryId, categoryRepo);
            popular = await globalUseCase.execute({ categoryIds, limit });
            fallbackUsed = false;
        }

        if (popular.length === 0) {
            return NextResponse.json({ items: [], personalized, fallbackUsed });
        }

        const products = await productRepo.findByIds(popular.map(p => p.productId));
        const byId = new Map(products.map(p => [p.id, p]));
        const items = popular
            .map(p => byId.get(p.productId))
            .filter((p): p is NonNullable<typeof p> => Boolean(p));

        return NextResponse.json({ items, personalized, fallbackUsed });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ message }, { status: 500 });
    }
}

async function expandCategoryIds(
    categoryId: string | null,
    categoryRepo: PrismaCategoryRepository,
): Promise<string[] | undefined> {
    if (!categoryId) return undefined;
    const all = await categoryRepo.findAll();
    return collectDescendantIds(categoryId, all);
}
