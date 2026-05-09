import type { CategoryRecommendationRepository } from '@/application/ports/CategoryRecommendationRepository';
import type { PopularCategory } from '@/domain/recommendation/PopularCategory';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';
import type { GetTopCategoriesUseCase } from './GetTopCategoriesUseCase';

export interface UserCategoryAffinityResult {
    items: PopularCategory[];
    personalized: boolean;
}

export class GetUserCategoryAffinityUseCase {
    constructor(
        private readonly repo: CategoryRecommendationRepository,
        private readonly fallback: GetTopCategoriesUseCase,
    ) {}

    async execute(userId: string, limit: number): Promise<UserCategoryAffinityResult> {
        const items = await this.repo.findTopCategoriesForUser(userId, {
            limit,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });

        if (items.length === 0) {
            const fallbackItems = await this.fallback.execute(limit);
            return { items: fallbackItems, personalized: false };
        }

        return { items, personalized: true };
    }
}
