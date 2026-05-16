import type { ReactNode } from 'react';
import styles from './CardGrid.module.css';

export interface CardGridProps {
  children: ReactNode;
  className?: string;
  /**
   * Mobile column count (≤767px). Defaults to 2 (product cards).
   * Use 3 for denser tile content (category tiles, where each tile is smaller).
   */
  mobileColumns?: 2 | 3;
}

/**
 * Responsive card grid: 4/3/2 columns at desktop/≤1200/≤900, then
 * 2 or 3 columns at ≤767 depending on `mobileColumns`. Used for product
 * card lists and category tile lists.
 */
export function CardGrid({ children, className, mobileColumns = 2 }: CardGridProps) {
  return (
    <section
      className={[
        styles.root,
        mobileColumns === 3 ? styles.dense : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}
