import { type NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PrismaProductRecommendationRepository } from '@/infrastructure/repositories/ProductRecommendationRepository.prisma';
import { GetGlobalPopularProductsUseCase } from '@/application/recommendation/GetGlobalPopularProductsUseCase';
import { GetRelatedProductsUseCase } from '@/application/recommendation/GetRelatedProductsUseCase';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

const buildResponse = unstable_cache(
    async (productId: string, limit: number) => {
        const productRepo = new PrismaProductRepository();
        const recRepo = new PrismaProductRecommendationRepository();
        const globalUseCase = new GetGlobalPopularProductsUseCase(recRepo);
        const useCase = new GetRelatedProductsUseCase(recRepo, productRepo, globalUseCase);

        const result = await useCase.execute(productId, limit);
        if (result.items.length === 0) {
            return { items: [], personalized: false, fallbackUsed: result.fallbackUsed };
        }

        const products = await productRepo.findByIds(result.items.map(i => i.productId));
        const byId = new Map(products.map(p => [p.id, p]));
        const items = result.items
            .map(i => byId.get(i.productId))
            .filter((p): p is NonNullable<typeof p> => Boolean(p));

        return { items, personalized: false, fallbackUsed: result.fallbackUsed };
    },
    ['recommendations:related'],
    { revalidate: 600, tags: ['recommendations:global'] },
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const productId = searchParams.get('productId');
        if (!productId) {
            return NextResponse.json({ message: 'productId is required' }, { status: 400 });
        }

        const parsedLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
        const limit = Math.min(isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit, MAX_LIMIT);

        const body = await buildResponse(productId, limit);
        return NextResponse.json(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ message }, { status: 500 });
    }
}
