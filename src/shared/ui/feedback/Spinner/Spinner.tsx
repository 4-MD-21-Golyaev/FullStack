import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

export function Spinner({ size = 'md', label = 'Загрузка...' }: SpinnerProps) {
  return (
    <span className={[styles.root, styles[size]].join(' ')} role="status" aria-label={label}>
      <span className={styles.circle} aria-hidden />
    </span>
  );
}
