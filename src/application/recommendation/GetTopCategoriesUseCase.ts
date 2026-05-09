import { type CategoryRecommendationRepository } from '@/application/ports/CategoryRecommendationRepository';
import { type PopularCategory } from '@/domain/recommendation/PopularCategory';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

export class GetTopCategoriesUseCase {
    constructor(private readonly repo: CategoryRecommendationRepository) {}

    async execute(limit: number): Promise<PopularCategory[]> {
        return this.repo.findTopCategories({
            limit,
            statusCodes: INCLUDED_ORDER_CODES,
            rootOnly: true,
            withTimeDecay: true,
        });
    }
}
