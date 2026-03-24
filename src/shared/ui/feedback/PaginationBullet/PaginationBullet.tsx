import styles from './PaginationBullet.module.css';

export interface PaginationBulletProps {
  active?: boolean;
  onClick?: () => void;
}

export function PaginationBullet({ active = false, onClick }: PaginationBulletProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={active ? `${styles.bullet} ${styles.active}` : styles.bullet}
    />
  );
}
