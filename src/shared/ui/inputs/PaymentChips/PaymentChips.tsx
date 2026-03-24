import styles from './PaymentChips.module.css';

export interface PaymentChipsProps {
  children: React.ReactNode;
  logo?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PaymentChips({
  children,
  logo,
  selected = false,
  onClick,
  className,
}: PaymentChipsProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        styles.root,
        selected ? styles.isSelected : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {logo && <span className={styles.logo}>{logo}</span>}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
