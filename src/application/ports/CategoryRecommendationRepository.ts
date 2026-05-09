import { type PopularCategory } from '@/domain/recommendation/PopularCategory';

export interface FindTopCategoriesOptions {
    limit: number;
    statusCodes: readonly string[];
    rootOnly?: boolean;
    withTimeDecay?: boolean;
}

export interface FindTopCategoriesForUserOptions {
    limit: number;
    statusCodes: readonly string[];
    withTimeDecay?: boolean;
}

export interface CategoryRecommendationRepository {
    findTopCategories(opts: FindTopCategoriesOptions): Promise<PopularCategory[]>;
    findTopCategoriesForUser(userId: string, opts: FindTopCategoriesForUserOptions): Promise<PopularCategory[]>;
}
