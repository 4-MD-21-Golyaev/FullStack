'use client';
import { Icon } from '../../icons/Icon/Icon';
import styles from './CategoryNavItem.module.css';

export interface CategoryNavItemProps {
  children: React.ReactNode;
  level?: 1 | 2;
  expanded?: boolean;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CategoryNavItem({
  children,
  level = 1,
  expanded = false,
  showChevron = true,
  onClick,
  className,
}: CategoryNavItemProps) {
  return (
    <button
      type="button"
      className={[
        styles.root,
        styles[`level${level}`],
        expanded ? styles.expanded : '',
        className ?? '',
      ].join(' ').trim()}
      onClick={onClick}
    >
      <span className={styles.label}>{children}</span>
      {showChevron && (
        <span className={styles.chevron}>
          <Icon name={expanded ? 'dropup' : 'dropdown'} size={16} />
        </span>
      )}
    </button>
  );
}
