import styles from './Tab.module.css';

export interface TabProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Tab({ children, active = false, onClick, className }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.root, active ? styles.isActive : '', className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
      {active && <span className={styles.underline} aria-hidden="true" />}
    </button>
  );
}
