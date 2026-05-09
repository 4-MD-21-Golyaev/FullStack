import { type NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { PrismaCategoryRecommendationRepository } from '@/infrastructure/repositories/CategoryRecommendationRepository.prisma';
import { GetTopCategoriesUseCase } from '@/application/recommendation/GetTopCategoriesUseCase';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 12;

const buildResponse = unstable_cache(
    async (limit: number) => {
        const categoryRepo = new PrismaCategoryRepository();
        const recRepo = new PrismaCategoryRecommendationRepository(categoryRepo);
        const useCase = new GetTopCategoriesUseCase(recRepo);

        const popular = await useCase.execute(limit);
        if (popular.length === 0) return { items: [], personalized: false, fallbackUsed: false };

        const allCategories = await categoryRepo.findAll();
        const byId = new Map(allCategories.map(c => [c.id, c]));
        const items = popular
            .map(p => byId.get(p.categoryId))
            .filter((c): c is NonNullable<typeof c> => Boolean(c));

        return { items, personalized: false, fallbackUsed: false };
    },
    ['recommendations:top-categories'],
    { revalidate: 600, tags: ['recommendations:global'] },
);

export async function GET(req: NextRequest) {
    try {
        const parsedLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
        const limit = Math.min(isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit, MAX_LIMIT);

        const body = await buildResponse(limit);
        return NextResponse.json(body);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ message }, { status: 500 });
    }
}
