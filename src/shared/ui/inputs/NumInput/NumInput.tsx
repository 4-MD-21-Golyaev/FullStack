import { InputBase } from '../InputBase/InputBase';
import styles from './NumInput.module.css';

export interface NumInputProps {
  value: number;
  onChange?: (value: number) => void;
  type?: 'amount' | 'weight';
  state?: 'enabled' | 'activated';
  className?: string;
}

export function NumInput({
  value,
  onChange,
  type = 'amount',
  state = 'enabled',
  className,
}: NumInputProps) {
  const unit = type === 'weight' ? 'кг' : 'шт';
  const isActivated = state === 'activated';

  return (
    <span className={[styles.root, styles[`type_${type}`], className ?? ''].join(' ').trim()}>
      <InputBase
        type="number"
        value={value}
        onChange={e => onChange?.(Number(e.target.value))}
        className={[styles.input, isActivated ? styles.activated : styles.enabled].join(' ')}
      />
      {!isActivated && (
        /* Overlay showing formatted value with unit in enabled state */
        <span className={styles.overlay} aria-hidden="true">
          {value}&nbsp;{unit}
        </span>
      )}
    </span>
  );
}
