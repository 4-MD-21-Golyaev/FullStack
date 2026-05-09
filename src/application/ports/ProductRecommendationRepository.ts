import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { type RelatedProduct } from '@/domain/recommendation/RelatedProduct';

export interface FindTopProductsOptions {
    categoryIds?: string[];
    limit: number;
    statusCodes: readonly string[];
    withTimeDecay?: boolean;
}

export interface FindRelatedProductsOptions {
    limit: number;
    minCoOccurrence: number;
    statusCodes: readonly string[];
}

export interface ProductRecommendationRepository {
    findTopProductsForUser(userId: string, opts: FindTopProductsOptions): Promise<PopularProduct[]>;
    findTopProductsGlobal(opts: FindTopProductsOptions): Promise<PopularProduct[]>;
    findRelatedProductsJaccard(productId: string, opts: FindRelatedProductsOptions): Promise<RelatedProduct[]>;
}
