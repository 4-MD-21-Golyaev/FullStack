'use client';
import { useRef, useEffect } from 'react';
import { Search, Spinner, Link } from '@/shared/ui';
import { useProductSearch, type ProductSearchResult } from './useProductSearch';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSelect: (product: ProductSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ onSelect, placeholder, className }: SearchBarProps) {
  const { query, setQuery, results, isLoading } = useProductSearch();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const showDropdown = query.trim().length >= 2;

  function handleSelect(product: ProductSearchResult) {
    onSelect(product);
    setQuery('');
  }

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      ref={containerRef}
    >
      <Search
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showDropdown && (
        <div className={styles.dropdown}>
          {isLoading && (
            <div className={styles.spinnerWrap}>
              <Spinner />
            </div>
          )}
          {!isLoading && results.length === 0 && (
            <p className={styles.hint}>Ничего не найдено</p>
          )}
          {!isLoading && results.length > 0 && (
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
              <Link
                href={`/catalog/search?q=${encodeURIComponent(query.trim())}`}
                className={styles.showAll}
              >
                Показать все результаты
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
