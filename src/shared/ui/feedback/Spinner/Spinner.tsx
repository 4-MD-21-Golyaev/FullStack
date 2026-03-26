import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerVariant = 'default' | 'current';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
}

export function Spinner({ size = 'md', variant = 'default', label = 'Загрузка...' }: SpinnerProps) {
  return (
    <span className={[styles.root, styles[size], variant === 'current' ? styles.current : ''].join(' ').trim()} role="status" aria-label={label}>
      <span className={styles.circle} aria-hidden />
    </span>
  );
}
