import { Icon } from '../../icons/Icon/Icon';
import styles from './Chips.module.css';

export interface ChipsProps {
  children: React.ReactNode;
  size?: 'lg' | 'md' | 'sm';
  selected?: boolean;
  disabled?: boolean;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
}

export function Chips({
  children,
  size = 'md',
  selected = false,
  disabled = false,
  onDismiss,
  onClick,
  className,
}: ChipsProps) {
  const sizeClass = size === 'lg' ? styles.size_lg : size === 'sm' ? styles.size_sm : styles.size_md;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        styles.root,
        sizeClass,
        selected ? styles.isSelected : '',
        disabled ? styles.isDisabled : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {onDismiss && (
        <span
          className={styles.dismiss}
          role="button"
          aria-label="Убрать"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <Icon name="cross" size={12} />
        </span>
      )}
    </button>
  );
}
