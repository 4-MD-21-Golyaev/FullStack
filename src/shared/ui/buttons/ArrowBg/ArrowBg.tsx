import styles from './ArrowBg.module.css';

type ArrowBgSize = 'sm' | 'md' | 'lg';
type ArrowBgDirection = 'left' | 'right';

interface ArrowBgProps {
  size?: ArrowBgSize;
  direction?: ArrowBgDirection;
  className?: string;
}

const DIMENSIONS: Record<ArrowBgSize, { width: number; height: number }> = {
  sm: { width: 32, height: 44 },
  md: { width: 40, height: 55 },
  lg: { width: 48, height: 66 },
};

export function ArrowBg({ size = 'sm', direction = 'right', className }: ArrowBgProps) {
  const { width, height } = DIMENSIONS[size];
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[styles.root, className ?? ''].join(' ').trim()}
      style={direction === 'left' ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <path
        d="M24 0C24 2.6386 25.8812 5.31728 28.3325 7.44024C29.3953 8.36076 30.6006 9.24031 31.6805 9.84024C32.1877 10.1623 32.7289 10.4285 33.2274 10.6582C41.9021 14.2742 47.9999 22.8347 48 32.8195C48 42.8084 41.8969 51.3707 33.2168 54.9844C32.721 55.2131 32.1845 55.48 31.6805 55.8C30.6006 56.4 29.3953 57.2795 28.3325 58.2C25.8812 60.3229 24 63.0017 24 65.6402V56.8195C10.7452 56.8195 0 46.0744 0 32.8195C0.000237496 19.5649 10.7453 8.81953 24 8.81953V0Z"
        fill="currentColor"
      />
    </svg>
  );
}
