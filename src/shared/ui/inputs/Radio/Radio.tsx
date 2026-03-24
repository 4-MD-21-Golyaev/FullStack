import styles from './Radio.module.css';

export interface RadioProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
}

export function Radio({ checked, onChange, disabled, name, value, id, className }: RadioProps) {
  return (
    <span className={[styles.root, disabled ? styles.disabled : '', className ?? ''].join(' ').trim()}>
      <input
        type="radio"
        className={styles.input}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        disabled={disabled}
        name={name}
        value={value}
        id={id}
        readOnly={!onChange}
      />
      <span className={[styles.circle, checked ? styles.checked : ''].join(' ').trim()} aria-hidden />
    </span>
  );
}
