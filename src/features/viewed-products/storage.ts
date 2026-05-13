const STORAGE_KEY = 'viewed_products';
const MAX_ITEMS = 20;

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / serialization errors
  }
}

/**
 * Append a product id to the viewed-products list. The id moves to the front
 * (most-recent first), duplicates are removed, and the list is capped at MAX_ITEMS.
 */
export function addViewedProduct(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  const current = readIds();
  const deduped = current.filter(existing => existing !== id);
  const next = [id, ...deduped].slice(0, MAX_ITEMS);
  writeIds(next);
}

export function getViewedProductIds(): string[] {
  return readIds();
}

export const VIEWED_PRODUCTS_STORAGE_KEY = STORAGE_KEY;
