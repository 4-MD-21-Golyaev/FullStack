import { Icon } from '../../icons/Icon/Icon';
import styles from './AlertBlock.module.css';

interface AlertBlockProps {
  type?: 'info' | 'alert';
  children: React.ReactNode;
}

export function AlertBlock({ type = 'info', children }: AlertBlockProps) {
  return (
    <div className={[styles.root, styles[type]].join(' ')}>
      <div className={styles.icon}>
        <Icon name={type === 'alert' ? 'attention' : 'info'} size={20} />
      </div>
      <span className={styles.text}>{children}</span>
    </div>
  );
}
