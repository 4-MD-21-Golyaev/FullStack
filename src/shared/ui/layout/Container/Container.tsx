import styles from './Container.module.css';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  const cls = [styles.container, className].filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
