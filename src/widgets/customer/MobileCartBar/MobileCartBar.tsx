'use client';

import { Button, Price } from '@/shared/ui';
import styles from './MobileCartBar.module.css';

interface MobileCartBarProps {
  total: number;
  onCheckout: () => void;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

export function MobileCartBar({ total, onCheckout, buttonText = 'К оформлению', disabled = false, className }: MobileCartBarProps) {
  return (
    <div className={[styles.root, className ?? ''].filter(Boolean).join(' ')}>
      <Button variant="primary" size="lg" onClick={onCheckout} disabled={disabled}>
        {buttonText}
      </Button>
      <Price value={total} size="L" />
    </div>
  );
}

export default MobileCartBar;
