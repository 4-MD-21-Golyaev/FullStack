import type { ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import type { CategoryRepository } from '@/application/ports/CategoryRepository';
import type { PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';
import { collectDescendantIds } from '@/domain/category/utils';
import type { GetGlobalPopularProductsUseCase } from './GetGlobalPopularProductsUseCase';

export interface UserPopularProductsResult {
    items: PopularProduct[];
    personalized: boolean;
    fallbackUsed: boolean;
}

export class GetUserPopularProductsUseCase {
    constructor(
        private readonly productRecRepo: ProductRecommendationRepository,
        private readonly categoryRepo: CategoryRepository,
        private readonly fallback: GetGlobalPopularProductsUseCase,
    ) {}

    async execute(userId: string, categoryId: string | null, limit: number): Promise<UserPopularProductsResult> {
        const categoryIds = await this.expandCategoryTree(categoryId);

        const personal = await this.productRecRepo.findTopProductsForUser(userId, {
            categoryIds,
            limit,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });

        if (personal.length > 0) {
            return { items: personal, personalized: true, fallbackUsed: false };
        }

        const fallbackItems = await this.fallback.execute({ categoryIds, limit });
        return { items: fallbackItems, personalized: false, fallbackUsed: true };
    }

    private async expandCategoryTree(categoryId: string | null): Promise<string[] | undefined> {
        if (!categoryId) return undefined;
        const all = await this.categoryRepo.findAll();
        return collectDescendantIds(categoryId, all);
    }
}
