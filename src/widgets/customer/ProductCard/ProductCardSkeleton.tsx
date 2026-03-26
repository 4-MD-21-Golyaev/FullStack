import { Skeleton } from '@/shared/ui';
import styles from './ProductCardSkeleton.module.css';

interface Props {
  size?: 'L' | 'S';
}

export function ProductCardSkeleton({ size = 'L' }: Props) {
  return (
    <div className={[styles.root, size === 'S' ? styles.sizeS : ''].filter(Boolean).join(' ')} aria-hidden>
      <span className={styles.image} />

      <div className={styles.info}>
        <div className={styles.nameLines}>
          <Skeleton width="90%" height="14px" />
          <Skeleton width="60%" height="14px" />
        </div>

        <div className={styles.bottom}>
          <Skeleton width="72px" height="22px" />
          <Skeleton width="40px" height="40px" borderRadius="50%" />
        </div>
      </div>
    </div>
  );
}
