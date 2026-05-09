import { type ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

export interface GetGlobalPopularProductsInput {
    categoryIds?: string[];
    limit: number;
}

export class GetGlobalPopularProductsUseCase {
    constructor(private readonly repo: ProductRecommendationRepository) {}

    async execute(input: GetGlobalPopularProductsInput): Promise<PopularProduct[]> {
        return this.repo.findTopProductsGlobal({
            categoryIds: input.categoryIds,
            limit: input.limit,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });
    }
}
