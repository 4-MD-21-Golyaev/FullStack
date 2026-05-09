import { describe, it, expect } from 'vitest';
import { collectDescendantIds, findRootCategoryId } from '../utils';
import { type Category } from '../Category';

const cat = (id: string, parentId: string | null = null, name = id): Category => ({
    id,
    name,
    imagePath: null,
    parentId,
});

describe('collectDescendantIds', () => {
    it('returns just the root id when there are no children', () => {
        const all = [cat('root'), cat('other-root')];

        const result = collectDescendantIds('root', all);

        expect(result).toEqual(['root']);
    });

    it('walks the tree breadth-first and returns root + all descendants', () => {
        const all = [
            cat('root'),
            cat('a', 'root'),
            cat('b', 'root'),
            cat('a1', 'a'),
            cat('a2', 'a'),
            cat('b1', 'b'),
            cat('a1-1', 'a1'),
        ];

        const result = collectDescendantIds('root', all);

        expect(result).toContain('root');
        expect(result).toContain('a');
        expect(result).toContain('b');
        expect(result).toContain('a1');
        expect(result).toContain('a2');
        expect(result).toContain('b1');
        expect(result).toContain('a1-1');
        expect(result).toHaveLength(7);
        // First element is always the seed.
        expect(result[0]).toBe('root');
    });

    it('returns only the seed id when the seed is missing from the list', () => {
        const all = [cat('a'), cat('b')];

        const result = collectDescendantIds('missing', all);

        // No category points to "missing" as parent, so only the seed is returned.
        expect(result).toEqual(['missing']);
    });

    it('does not follow broken parent references', () => {
        const all = [
            cat('root'),
            cat('orphan', 'ghost'), // parent does not exist
        ];

        const result = collectDescendantIds('root', all);

        expect(result).toEqual(['root']);
    });

    it('returns subtree only when called on a non-root node', () => {
        const all = [
            cat('root'),
            cat('a', 'root'),
            cat('a1', 'a'),
            cat('b', 'root'),
        ];

        const result = collectDescendantIds('a', all);

        expect(result.sort()).toEqual(['a', 'a1']);
    });
});

describe('findRootCategoryId', () => {
    it('returns the same id when category has no parent', () => {
        const all = [cat('root'), cat('other')];

        expect(findRootCategoryId('root', all)).toBe('root');
    });

    it('walks up to the root when called on a leaf', () => {
        const all = [
            cat('root'),
            cat('a', 'root'),
            cat('a1', 'a'),
            cat('a1-1', 'a1'),
        ];

        expect(findRootCategoryId('a1-1', all)).toBe('root');
    });

    it('returns the input id when category id is missing from the list', () => {
        const all = [cat('root')];

        expect(findRootCategoryId('missing', all)).toBe('missing');
    });

    it('returns the last reachable ancestor when parent chain breaks', () => {
        const all = [
            cat('a', 'ghost'), // parent does not exist
            cat('child', 'a'),
        ];

        // child -> a (parent ghost not found) -> stop at "a"
        expect(findRootCategoryId('child', all)).toBe('a');
    });

    it('handles single-step parent chain', () => {
        const all = [cat('root'), cat('a', 'root')];

        expect(findRootCategoryId('a', all)).toBe('root');
    });
});
