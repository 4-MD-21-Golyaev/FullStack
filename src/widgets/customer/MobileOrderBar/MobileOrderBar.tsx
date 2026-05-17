'use client';

import { Button } from '@/shared/ui';
import styles from './MobileOrderBar.module.css';

interface MobileOrderBarProps {
  onRepeat?: () => void;
  onCancel?: () => void;
}

export function MobileOrderBar({ onRepeat, onCancel }: MobileOrderBarProps) {
  if (!onRepeat && !onCancel) return null;
  return (
    <div className={styles.root}>
      {onRepeat && (
        <Button variant="secondary" size="lg" onClick={onRepeat} className={styles.repeat}>
          Повторить заказ
        </Button>
      )}
      {onCancel && (
        <Button variant="danger" size="lg" onClick={onCancel} className={styles.cancel}>
          Отменить
        </Button>
      )}
    </div>
  );
}

export default MobileOrderBar;
