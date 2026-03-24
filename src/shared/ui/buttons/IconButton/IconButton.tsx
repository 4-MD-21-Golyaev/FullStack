'use client';
import { Icon } from '../../icons/Icon/Icon';
import type { IconName } from '../../icons/Icon/Icon';
import styles from './IconButton.module.css';

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';
type IconButtonVariant = 'white' | 'gray' | 'red';

const ICON_SIZES: Record<IconButtonSize, number> = { xs: 12, sm: 16, md: 20, lg: 24 };

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'gray',
  disabled,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={[styles.root, styles[size], styles[variant], className ?? ''].join(' ').trim()}
      disabled={disabled}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
    </button>
  );
}
