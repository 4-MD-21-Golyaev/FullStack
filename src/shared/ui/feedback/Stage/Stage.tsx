import { StageIcon } from '../StageIcon/StageIcon';
import { Icon } from '../../icons/Icon/Icon';
import type { IconName } from '../../icons/Icon/Icon';
import styles from './Stage.module.css';

interface StageProps {
  iconName: IconName;
  label?: string;
  state?: 'enabled' | 'activated';
  size?: 'L' | 'S';
}

export function Stage({ iconName, label, state = 'enabled', size = 'L' }: StageProps) {
  return (
    <div className={[styles.root, styles[`size${size}`]].join(' ')}>
      <StageIcon
        state={state}
        icon={<Icon name={iconName} size={20} color="currentColor" />}
      />
      {size === 'L' && label && (
        <span className={styles.label}>{label}</span>
      )}
    </div>
  );
}
