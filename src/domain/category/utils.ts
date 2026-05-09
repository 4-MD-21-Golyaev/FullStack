import { type Category } from './Category';

/**
 * Returns the category id together with all transitive descendant ids.
 * BFS over the in-memory category list — no DB calls.
 */
export function collectDescendantIds(rootId: string, all: Category[]): string[] {
    const ids: string[] = [rootId];
    const queue = [rootId];
    while (queue.length > 0) {
        const parentId = queue.shift()!;
        for (const cat of all) {
            if (cat.parentId === parentId) {
                ids.push(cat.id);
                queue.push(cat.id);
            }
        }
    }
    return ids;
}

/**
 * Walks parent chain up from `categoryId` to find its root.
 * Returns the input id itself if no parent exists or chain is broken.
 */
export function findRootCategoryId(categoryId: string, all: Category[]): string {
    const byId = new Map(all.map(c => [c.id, c]));
    let current = byId.get(categoryId);
    if (!current) return categoryId;
    while (current.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent) return current.id;
        current = parent;
    }
    return current.id;
}
