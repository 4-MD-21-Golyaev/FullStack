import { randomUUID } from 'crypto';
import { MoySkladGateway } from '@/application/ports/MoySkladGateway';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { CategoryRepository } from '@/application/ports/CategoryRepository';
import { MoySkladFolder } from '@/domain/moysklad/MoySkladProduct';

export interface SyncResult {
    created: number;
    updated: number;
    hidden: number;
    categoriesProcessed: number;
}

export class SyncProductsUseCase {
    constructor(
        private gateway: MoySkladGateway,
        private productRepository: ProductRepository,
        private categoryRepository: CategoryRepository,
    ) {}

    async execute(): Promise<SyncResult> {
        const folders = await this.gateway.fetchFolders();
        const folderIdToLocalCategoryId = await this.syncCategories(folders);

        const msProducts = await this.gateway.fetchProducts();
        const localProducts = await this.productRepository.findAll();

        const localByArticle = new Map(localProducts.map(p => [p.article, p]));
        const msArticles = new Set(msProducts.map(p => p.article));

        let created = 0;
        let updated = 0;

        for (const msp of msProducts) {
            if (!msp.folderId) continue; // товар без папки — пропускаем

            const localCategoryId = folderIdToLocalCategoryId.get(msp.folderId);
            if (!localCategoryId) continue; // папка не смаплена — пропускаем

            const local = localByArticle.get(msp.article);
            if (local) {
                await this.productRepository.save({
                    ...local,
                    name:       msp.name,
                    price:      msp.price,
                    stock:      msp.stock,
                    categoryId: localCategoryId,
                });
                updated++;
            } else {
                await this.productRepository.save({
                    id:         randomUUID(),
                    name:       msp.name,
                    article:    msp.article,
                    price:      msp.price,
                    stock:      msp.stock,
                    categoryId: localCategoryId,
                    imagePath:  null,
                });
                created++;
            }
        }

        // Скрываем товары, которых больше нет в МойСклад
        let hidden = 0;
        for (const local of localProducts) {
            if (!msArticles.has(local.article) && local.stock !== 0) {
                await this.productRepository.save({ ...local, stock: 0 });
                hidden++;
            }
        }

        return { created, updated, hidden, categoriesProcessed: folders.length };
    }

    private async syncCategories(folders: MoySkladFolder[]): Promise<Map<string, string>> {
        const localCategories = await this.categoryRepository.findAll();
        const localByNameAndParent = new Map(
            localCategories.map(c => [`${c.name}|${c.parentId ?? 'root'}`, c])
        );

        const folderIdToLocalId = new Map<string, string>();

        // Топологическая сортировка: сначала корневые, потом вложенные
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
