'use client';
import { Modal, Search, Spinner } from '@/shared/ui';
import { useProductSearch, ProductSearchResult } from './useProductSearch';
import styles from './ProductSearchModal.module.css';

interface Props {
  open: boolean;
  onSelect: (product: ProductSearchResult) => void;
  onClose: () => void;
}

export function ProductSearchModal({ open, onSelect, onClose }: Props) {
  const { query, setQuery, results, isLoading } = useProductSearch();

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.root}>
        <h2 className={styles.title}>Выбрать замену</h2>
        <Search
          size="lg"
          placeholder="Название или артикул"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.results}>
          {isLoading && (
            <div className={styles.spinnerWrap}>
              <Spinner />
            </div>
          )}
          {!isLoading && query.trim().length < 2 && (
            <p className={styles.hint}>Введите не менее 2 символов</p>
          )}
          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <p className={styles.hint}>Ничего не найдено</p>
          )}
          {!isLoading && results.map((product) => (
            /*
             * Raw <button> is used here intentionally:
             * shared/ui has no list-item / row component for selectable results.
             * Button (shared/ui) is for primary actions with specific visual weight —
             * not suitable for a dense scrollable result list.
             */
            <button
              key={product.id}
              className={styles.resultItem}
              onClick={() => { onSelect(product); }}
              type="button"
            >
              <span className={styles.resultName}>{product.name}</span>
              <span className={styles.resultMeta}>
                {product.article} · {product.price.toLocaleString('ru')} ₽
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
