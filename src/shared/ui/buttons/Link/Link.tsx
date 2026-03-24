import NextLink from 'next/link';
import { Icon } from '../../icons/Icon/Icon';
import styles from './Link.module.css';

export interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: 'S' | 'M' | 'L';
  showIcon?: boolean;
}

export function Link({ href, children, className, size = 'S', showIcon = false }: LinkProps) {
  return (
    <NextLink
      href={href}
      className={[
        styles.link,
        styles[`size${size}`],
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
      {showIcon && (
        <Icon name="arrow_right" size={size === 'S' ? 12 : 16} className={styles.icon} />
      )}
    </NextLink>
  );
}
