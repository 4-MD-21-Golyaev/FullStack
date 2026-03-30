import styles from './StageIcon.module.css';

interface StageIconProps {
  state?: 'enabled' | 'activated';
  icon: React.ReactNode;
}

export function StageIcon({ state = 'enabled', icon }: StageIconProps) {
  return (
    <div className={[styles.root, styles[state]].join(' ')}>
      <div className={styles.inner}>
        <div className={styles.iconSlot}>{icon}</div>
      </div>
    </div>
  );
}
