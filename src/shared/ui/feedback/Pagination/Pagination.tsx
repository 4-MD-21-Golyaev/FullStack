import { PaginationBullet } from '../PaginationBullet/PaginationBullet';
import styles from './Pagination.module.css';

export interface PaginationProps {
  count: number;
  active: number;
  onSelect?: (index: number) => void;
  className?: string;
}

export function Pagination({ count, active, onSelect, className }: PaginationProps) {
  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`} role="group" aria-label="Pagination">
      {Array.from({ length: count }, (_, i) => (
        <PaginationBullet
          key={i}
          active={i === active}
          onClick={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </div>
  );
}
