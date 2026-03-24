'use client';
import { Icon } from '../../icons/Icon/Icon';
import styles from './LikeButton.module.css';

interface LikeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'md' | 'lg';
  variant?: 'ghost' | 'white';
}

const ICON_SIZES: Record<NonNullable<LikeButtonProps['size']>, number> = {
  md: 20,
  lg: 24,
};

export function LikeButton({
  active = false,
  size = 'md',
  variant = 'ghost',
  className,
  ...rest
}: LikeButtonProps) {
  return (
    <button
      type="button"
      className={[
        styles.root,
        styles[size],
        styles[variant],
        active ? styles.active : '',
        className ?? '',
      ].join(' ').trim()}
      {...rest}
    >
      <Icon name={active ? 'like_filled' : 'like'} size={ICON_SIZES[size]} />
    </button>
  );
}
