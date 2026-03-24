import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'discount';
type BadgeSize = 'S' | 'M';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', size = 'S', children }: BadgeProps) {
  return (
    <span className={[styles.root, styles[variant], size === 'M' ? styles.sizeM : ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
