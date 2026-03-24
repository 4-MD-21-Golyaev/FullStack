'use client';
import { ArrowBg } from '../ArrowBg/ArrowBg';
import styles from './ArrowButton.module.css';

type ArrowButtonSize = 'sm' | 'md' | 'lg';

interface ArrowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction?: 'left' | 'right';
  size?: ArrowButtonSize;
}

const ICON_SIZES: Record<ArrowButtonSize, number> = { sm: 16, md: 20, lg: 24 };
const BG_DIMENSIONS: Record<ArrowButtonSize, { width: number; height: number }> = {
  sm: { width: 32, height: 44 },
  md: { width: 40, height: 55 },
  lg: { width: 48, height: 66 },
};

export function ArrowButton({
  direction = 'right',
  size = 'md',
  className,
  ...rest
}: ArrowButtonProps) {
  const iconSize = ICON_SIZES[size];
  const bgSize = BG_DIMENSIONS[size];
  return (
    <div
      className={[styles.wrapper, styles[size], className ?? ''].join(' ').trim()}
      style={{ width: bgSize.width, height: bgSize.height }}
    >
      <ArrowBg size={size} direction={direction} className={styles.bg} />
      <button
        type="button"
        className={[styles.root, styles[size]].join(' ')}
        {...rest}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}
        >
          <path
            d="M8 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
