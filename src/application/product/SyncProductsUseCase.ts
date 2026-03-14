import { randomUUID } from 'crypto';
import { MoySkladCatalogGateway } from '@/application/ports/MoySkladCatalogGateway';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { CategoryRepository } from '@/application/ports/CategoryRepository';
import { ImageStorageGateway } from '@/application/ports/ImageStorageGateway';
import { MoySkladFolder } from '@/domain/moysklad/MoySkladProduct';

export interface SyncResult {
    created: number;
    updated: number;
    hidden: number;
    categoriesProcessed: number;
    imagesImported: number;
    imageAttempts: number;
    imageErrors: string[];
}

export class SyncProductsUseCase {
    constructor(
        private gateway: MoySkladCatalogGateway,
        private productRepository: ProductRepository,
        private categoryRepository: CategoryRepository,
        private imageStorage: ImageStorageGateway | null = null,
    ) {}

    async execute(): Promise<SyncResult> {
        // 1. Sync categories
        const folders = await this.gateway.fetchFolders();
        const folderIdToLocalCategoryId = await this.syncCategories(folders);

        // 2. Sync catalog (products from /entity/product)
        const msProducts = await this.gateway.fetchProducts();
        const localProducts = await this.productRepository.findAll();

        const localByArticle = new Map(localProducts.map(p => [p.article, p]));
        const msArticles = new Set(msProducts.map(p => p.article));

        let created = 0;
        let updated = 0;
        let imagesImported = 0;
        let imageAttempts = 0;
        const imageErrors: string[] = [];

        for (const msp of msProducts) {
            const localCategoryId = msp.folderId
                ? folderIdToLocalCategoryId.get(msp.folderId) ?? null
                : null;

            const local = localByArticle.get(msp.article);
            if (local) {
                let imagePath = local.imagePath;
                if (this.imageStorage && !imagePath && msp.hasImages) {
                    imageAttempts++;
                    const result = await this.tryImportImage(msp.id, msp.article);
                    if (result.path) {
                        imagePath = result.path;
                        imagesImported++;
                    } else {
                        imageErrors.push(`${msp.article}: ${result.error}`);
                    }
                }
                await this.productRepository.save({
                    ...local,
                    name:       msp.name,
                    price:      msp.price,
                    categoryId: localCategoryId ?? local.categoryId,
                    imagePath,
                });
                updated++;
            } else {
                if (!localCategoryId) continue;

                let imagePath: string | null = null;
                if (this.imageStorage && msp.hasImages) {
                    imageAttempts++;
                    const result = await this.tryImportImage(msp.id, msp.article);
                    if (result.path) {
                        imagePath = result.path;
                        imagesImported++;
                    } else {
                        imageErrors.push(`${msp.article}: ${result.error}`);
                    }
                }
                await this.productRepository.save({
                    id:         randomUUID(),
                    name:       msp.name,
                    article:    msp.article,
                    price:      msp.price,
                    stock:      0,
                    categoryId: localCategoryId,
                    imagePath,
                });
                created++;
            }
        }

        // 3. Sync stock separately from /report/stock/all
        const stockItems = await this.gateway.fetchStock();
        const stockByArticle = new Map(stockItems.map(s => [s.article, s.stock]));

        // Re-fetch local products to include newly created ones
        const allLocal = await this.productRepository.findAll();
        for (const product of allLocal) {
            const msStock = stockByArticle.get(product.article);
            const newStock = msStock ?? 0;
            if (product.stock !== newStock) {
                await this.productRepository.save({ ...product, stock: newStock });
            }
        }

        // Hide products not present in MoySklad catalog
        let hidden = 0;
        for (const local of localProducts) {
            if (!msArticles.has(local.article) && local.stock !== 0) {
                await this.productRepository.save({ ...local, stock: 0 });
                hidden++;
            }
        }

        return { created, updated, hidden, categoriesProcessed: folders.length, imagesImported, imageAttempts, imageErrors };
    }

    private async tryImportImage(msProductId: string, article: string): Promise<{ path: string | null; error: string | null }> {
        try {
            const image = await this.gateway.fetchProductImage(msProductId);
            if (!image) {
                return { path: null, error: `no image in MoySklad (msId=${msProductId})` };
            }
            const path = await this.imageStorage!.save(image.bytes, article, image.filename);
            return { path, error: null };
        } catch (err: any) {
            return { path: null, error: `${err.message ?? err} (msId=${msProductId})` };
        }
    }

    private async syncCategories(folders: MoySkladFolder[]): Promise<Map<string, string>> {
        const localCategories = await this.categoryRepository.findAll();
        const localByNameAndParent = new Map(
            localCategories.map(c => [`${c.name}|${c.parentId ?? 'root'}`, c])
        );

        const folderIdToLocalId = new Map<string, string>();

        const sorted = topSort(folders);

        for (const folder of sorted) {
            const parentLocalId = folder.parentId
                ? folderIdToLocalId.get(folder.parentId) ?? null
                : null;

            const key = `${folder.name}|${parentLocalId ?? 'root'}`;
            const existing = localByNameAndParent.get(key);

            if (existing) {
                folderIdToLocalId.set(folder.id, existing.id);
            } else {
                const newId = randomUUID();
                await this.categoryRepository.save({
                    id:        newId,
                    name:      folder.name,
                    parentId:  parentLocalId,
                    imagePath: null,
                });
                folderIdToLocalId.set(folder.id, newId);
            }
        }

        return folderIdToLocalId;
    }
}

function topSort(folders: MoySkladFolder[]): MoySkladFolder[] {
    const byId = new Map(folders.map(f => [f.id, f]));
    const result: MoySkladFolder[] = [];
    const visited = new Set<string>();

    function visit(f: MoySkladFolder) {
        if (visited.has(f.id)) return;
        if (f.parentId && byId.has(f.parentId)) {
            visit(byId.get(f.parentId)!);
        }
        visited.add(f.id);
        result.push(f);
    }

    for (const f of folders) visit(f);
    return result;
}
