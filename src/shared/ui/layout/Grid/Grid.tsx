import styles from './Grid.module.css';

interface GridProps {
  children: React.ReactNode;
  className?: string;
}

export function Grid({ children, className }: GridProps) {
  const cls = [styles.grid, className].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
