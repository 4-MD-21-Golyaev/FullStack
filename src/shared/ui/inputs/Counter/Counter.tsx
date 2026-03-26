import { IconButton } from '../../buttons/IconButton/IconButton';
import { NumInput } from '../NumInput/NumInput';
import styles from './Counter.module.css';

export interface CounterProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  type?: 'amount' | 'weight';
  size?: 'lg' | 'sm';
  variant?: 'gray' | 'white';
  /** Stretches counter to 100% of parent height; use when parent has a fixed height */
  fluid?: boolean;
  className?: string;
}

export function Counter({
  value,
  onChange,
  min,
  max,
  type = 'amount',
  size = 'lg',
  variant = 'gray',
  fluid = false,
  className,
}: CounterProps) {
  const isAtMin = min !== undefined && value <= min;
  const isAtMax = max !== undefined && value >= max;

  /* IconButton size: lg Counter uses md (44px), sm Counter uses sm (36px) */
  const btnSize = size === 'lg' ? 'md' : 'sm';
  const btnVariant = variant === 'white' ? 'white' : 'gray';
  const inputState = 'enabled';

  const btnCls = [styles.btnMinus, fluid ? styles.btnFluid : ''].join(' ').trim();

  return (
    <span className={[styles.root, styles[size], styles[variant], fluid ? styles.fluid : '', className ?? ''].join(' ').trim()}>
      <IconButton
        icon="minus"
        size={btnSize}
        variant={btnVariant}
        disabled={isAtMin}
        onClick={() => onChange?.(value - 1)}
        aria-label="Уменьшить"
        className={btnCls}
      />
      <NumInput
        value={value}
        onChange={onChange}
        type={type}
        state={inputState}
        className={[styles.numInput, variant === 'white' ? styles.numInputWhite : ''].join(' ').trim()}
      />
      <IconButton
        icon="plus"
        size={btnSize}
        variant={btnVariant}
        disabled={isAtMax}
        onClick={() => onChange?.(value + 1)}
        aria-label="Увеличить"
        className={btnCls}
      />
    </span>
  );
}
