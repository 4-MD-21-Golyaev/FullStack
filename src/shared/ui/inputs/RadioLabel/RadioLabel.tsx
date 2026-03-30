import { Radio } from '../Radio/Radio';
import type { RadioProps } from '../Radio/Radio';
import { Icon } from '../../icons/Icon/Icon';
import styles from './RadioLabel.module.css';

export interface RadioLabelProps extends RadioProps {
  label: string;
  showInfo?: boolean;
}

export function RadioLabel({ label, showInfo, ...radioProps }: RadioLabelProps) {
  return (
    <label className={`${styles.root}${radioProps.disabled ? ` ${styles.disabled}` : ''}`}>
      <Radio {...radioProps} />
      <span className={styles.text}>{label}</span>
      {showInfo && (
        <span className={styles.infoIcon}>
          <Icon name="info" size={16} color="var(--ctx-color-text-secondary)" />
        </span>
      )}
    </label>
  );
}
