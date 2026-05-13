'use client';

import { Button } from '@/shared/ui';
import styles from './MobileOrderBar.module.css';

interface MobileOrderBarProps {
  onRepeat: () => void;
  onCancel?: () => void;
}

export function MobileOrderBar({ onRepeat, onCancel }: MobileOrderBarProps) {
  return (
    <div className={styles.root}>
      <Button variant="secondary" size="lg" onClick={onRepeat} className={styles.repeat}>
        Повторить заказ
      </Button>
      {onCancel && (
        <Button variant="tertiary" size="lg" onClick={onCancel} className={styles.cancel}>
          Отменить
        </Button>
      )}
    </div>
  );
}

export default MobileOrderBar;
