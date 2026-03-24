import { Switch } from '../Switch/Switch';
import type { SwitchProps } from '../Switch/Switch';
import styles from './SwitchLabel.module.css';

export interface SwitchLabelProps extends SwitchProps {
  label: string;
}

export function SwitchLabel({ label, className, ...switchProps }: SwitchLabelProps) {
  return (
    <label className={[styles.root, className ?? ''].join(' ').trim()}>
      <Switch {...switchProps} />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
