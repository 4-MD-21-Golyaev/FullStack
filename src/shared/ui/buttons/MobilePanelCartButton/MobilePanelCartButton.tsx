'use client';
import { MobilePanelButton } from '../MobilePanelButton/MobilePanelButton';
import styles from './MobilePanelCartButton.module.css';

interface MobilePanelCartButtonProps {
  count?: number;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  active?: boolean;
}

export function MobilePanelCartButton({ count = 0, onClick, className, active = false }: MobilePanelCartButtonProps) {
  return (
    <div className={[styles.wrapper, className ?? ''].join(' ').trim()}>
      <MobilePanelButton icon="cart" state={active ? 'activated' : 'enabled'} onClick={onClick} />
      {count > 0 && (
        <span className={styles.badge}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
