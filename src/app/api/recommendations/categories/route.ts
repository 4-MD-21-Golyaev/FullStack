import { type NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { PrismaCategoryRecommendationRepository } from '@/infrastructure/repositories/CategoryRecommendationRepository.prisma';
import { GetTopCategoriesUseCase } from '@/application/recommendation/GetTopCategoriesUseCase';
import { GetUserCategoryAffinityUseCase } from '@/application/recommendation/GetUserCategoryAffinityUseCase';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
    try {
        const parsedLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
        const limit = Math.min(isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit, MAX_LIMIT);

        const userId = req.headers.get('x-user-id');

        const categoryRepo = new PrismaCategoryRepository();
        const recRepo = new PrismaCategoryRecommendationRepository(categoryRepo);
        const topCategories = new GetTopCategoriesUseCase(recRepo);

        let popular;
        let personalized = false;
        let fallbackUsed = false;

        if (userId) {
            const affinity = new GetUserCategoryAffinityUseCase(recRepo, topCategories);
            const result = await affinity.execute(userId, limit);
            popular = result.items;
            personalized = result.personalized;
            fallbackUsed = !result.personalized;
        } else {
            popular = await topCategories.execute(limit);
        }

        if (popular.length === 0) {
            return NextResponse.json({ items: [], personalized, fallbackUsed });
        }

        const allCategories = await categoryRepo.findAll();
        const byId = new Map(allCategories.map(c => [c.id, c]));
        const items = popular
            .map(p => byId.get(p.categoryId))
            .filter((c): c is NonNullable<typeof c> => Boolean(c));

        return NextResponse.json({ items, personalized, fallbackUsed });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ message }, { status: 500 });
    }
}
