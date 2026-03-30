import styles from './ProfileField.module.css';

export interface ProfileFieldProps {
  label: string;
  value: string;
  size?: 'M' | 'S'; // default 'M'
  className?: string;
}

export function ProfileField({ label, value, size = 'M', className }: ProfileFieldProps) {
  return (
    <div className={[styles.root, styles[`size${size}`], className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
