'use client';
import { IconButton } from '../IconButton/IconButton';
import styles from './CartButton.module.css';

interface CartButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  count?: number;
}

export function CartButton({ count = 0, className, ...rest }: CartButtonProps) {
  return (
    <div className={[styles.wrapper, className ?? ''].join(' ').trim()}>
      <IconButton icon="cart" size="lg" variant="white" {...rest} />
      {count > 0 && (
        <span className={styles.badge}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
}
