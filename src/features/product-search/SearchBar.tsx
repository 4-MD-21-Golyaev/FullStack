'use client';
import { useEffect, useRef } from 'react';
import { Search, Spinner, Link } from '@/shared/ui';
import { useProductSearch, type ProductSearchResult } from './useProductSearch';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSelect: (product: ProductSearchResult) => void;
  placeholder?: string;
  className?: string;
  /** When true: results render in flow below input (not as floating dropdown). */
  inline?: boolean;
  /** When true: hide "Показать все" link and enable infinite scroll via IntersectionObserver. */
  infinite?: boolean;
}

export function SearchBar({ onSelect, placeholder, className, inline, infinite }: SearchBarProps) {
  const { query, setQuery, results, isLoading, loadMore, hasMore } = useProductSearch();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [setQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setQuery]);

  useEffect(() => {
    if (!infinite) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { root: null, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infinite, hasMore, isLoading, loadMore]);

  const showDropdown = query.trim().length >= 2;

  function handleSelect(product: ProductSearchResult) {
    onSelect(product);
    setQuery('');
  }

  return (
    <div
      className={[styles.root, inline ? styles.inline : '', className].filter(Boolean).join(' ')}
      ref={containerRef}
    >
      <Search
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showDropdown && (
        <div className={[styles.dropdown, inline ? styles.dropdownInline : ''].filter(Boolean).join(' ')}>
          {isLoading && results.length === 0 && (
            <div className={styles.spinnerWrap}>
              <Spinner />
            </div>
          )}
          {!isLoading && results.length === 0 && (
            <p className={styles.hint}>Ничего не найдено</p>
          )}
          {results.length > 0 && (
            <>
              {results.map((product) => (
                /*
                 * Raw <button> is used here intentionally:
                 * shared/ui has no list-item / row component for selectable results.
                 * Button (shared/ui) is for primary actions with specific visual weight —
                 * not suitable for a dense scrollable result list.
                 */
                <button
                  key={product.id}
                  className={styles.resultItem}
                  onClick={() => handleSelect(product)}
                  type="button"
                >
                  <span className={styles.resultName}>{product.name}</span>
                  <span className={styles.resultMeta}>
                    {product.article} · {product.price.toLocaleString('ru')} ₽
                  </span>
                </button>
              ))}
              {infinite && hasMore && (
                <div ref={sentinelRef} className={styles.sentinel}>
                  {isLoading && <Spinner />}
                </div>
              )}
              {!infinite && (
                <Link
                  href={`/catalog/search?q=${encodeURIComponent(query.trim())}`}
                  className={styles.showAll}
                >
                  Показать все результаты
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
