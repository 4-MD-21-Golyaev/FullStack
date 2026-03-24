import styles from './CodeSegment.module.css';

export interface CodeSegmentProps {
  value?: string;
  state?: 'enabled' | 'activated' | 'error';
  className?: string;
}

export function CodeSegment({ value, state = 'enabled', className }: CodeSegmentProps) {
  return (
    <div
      className={[
        styles.root,
        styles[`state_${state}`],
        className ?? '',
      ].join(' ').trim()}
    >
      {value && <span className={styles.digit}>{value}</span>}
    </div>
  );
}
