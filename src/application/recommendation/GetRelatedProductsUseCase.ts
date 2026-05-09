import type { ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import type { ProductRepository } from '@/application/ports/ProductRepository';
import type { RelatedProduct } from '@/domain/recommendation/RelatedProduct';
import type { PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';
import type { GetGlobalPopularProductsUseCase } from './GetGlobalPopularProductsUseCase';

const MIN_CO_OCCURRENCE = 3;

export interface RelatedProductsResultItem {
    productId: string;
    coOccurrenceCount: number;
    jaccardScore: number;
}

export interface RelatedProductsResult {
    items: RelatedProductsResultItem[];
    fallbackUsed: boolean;
}

export class GetRelatedProductsUseCase {
    constructor(
        private readonly productRecRepo: ProductRecommendationRepository,
        private readonly productRepo: ProductRepository,
        private readonly fallback: GetGlobalPopularProductsUseCase,
    ) {}

    async execute(productId: string, limit: number): Promise<RelatedProductsResult> {
        const related = await this.productRecRepo.findRelatedProductsJaccard(productId, {
            limit,
            minCoOccurrence: MIN_CO_OCCURRENCE,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        if (related.length > 0) {
            return { items: this.toItems(related), fallbackUsed: false };
        }

        const seed = await this.productRepo.findById(productId);
        if (!seed) {
            return { items: [], fallbackUsed: true };
        }

        const popular = await this.fallback.execute({
            categoryIds: [seed.categoryId],
            limit: limit + 1,
        });
        const filtered = popular.filter(p => p.productId !== productId).slice(0, limit);

        return { items: this.toFallbackItems(filtered), fallbackUsed: true };
    }

    private toItems(related: RelatedProduct[]): RelatedProductsResultItem[] {
        return related.map(r => ({
            productId: r.productId,
            coOccurrenceCount: r.coOccurrenceCount,
            jaccardScore: r.jaccardScore,
        }));
    }

    private toFallbackItems(popular: PopularProduct[]): RelatedProductsResultItem[] {
        return popular.map(p => ({
            productId: p.productId,
            coOccurrenceCount: 0,
            jaccardScore: 0,
        }));
    }
}
