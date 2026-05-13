'use client';

import { Button, Price } from '@/shared/ui';
import styles from './MobileCartBar.module.css';

interface MobileCartBarProps {
  total: number;
  onCheckout: () => void;
}

export function MobileCartBar({ total, onCheckout }: MobileCartBarProps) {
  return (
    <div className={styles.root}>
      <Button variant="primary" size="lg" onClick={onCheckout}>
        К оформлению
      </Button>
      <Price value={total} size="L" />
    </div>
  );
}

export default MobileCartBar;
