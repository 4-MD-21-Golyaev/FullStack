import { Radio } from '../Radio/Radio';
import type { RadioProps } from '../Radio/Radio';
import styles from './RadioLabel.module.css';

export interface RadioLabelProps extends RadioProps {
  label: string;
}

export function RadioLabel({ label, ...radioProps }: RadioLabelProps) {
  return (
    <label className={`${styles.root}${radioProps.disabled ? ` ${styles.disabled}` : ''}`}>
      <Radio {...radioProps} />
      <span className={styles.text}>{label}</span>
    </label>
  );
}
