import { Icon } from '../../icons/Icon/Icon';
import styles from './AccountTab.module.css';

export interface AccountTabProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AccountTab({ children, icon, onClick, className }: AccountTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.root, className ?? ''].filter(Boolean).join(' ')}
    >
      <span className={styles.iconFrame} aria-hidden="true">
        {icon ?? <Icon name="account" size={20} />}
      </span>
      <span className={styles.label}>{children}</span>
      <span className={styles.arrow} aria-hidden="true">
        <Icon name="arrow_right" size={20} />
      </span>
    </button>
  );
}
