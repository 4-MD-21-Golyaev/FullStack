import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({ checked, onChange, disabled, id, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={[styles.root, checked ? styles.on : styles.off, className ?? ''].join(' ').trim()}
    >
      <span className={styles.thumb} />
    </button>
  );
}
