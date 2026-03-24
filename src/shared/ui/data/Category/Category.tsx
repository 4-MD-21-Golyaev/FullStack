import NextLink from 'next/link';
import Image from 'next/image';
import styles from './Category.module.css';

export interface CategoryProps {
  label: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  size?: 'L' | 'S';
  className?: string;
}

export function Category({
  label,
  href,
  imageSrc,
  imageAlt = '',
  size = 'L',
  className,
}: CategoryProps) {
  return (
    <NextLink
      href={href}
      className={[styles.root, styles[`size${size}`], className].filter(Boolean).join(' ')}
    >
      {imageSrc && (
        <div className={styles.imageWrap}>
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className={styles.image}
            sizes={size === 'L' ? '180px' : '108px'}
          />
        </div>
      )}
      <span className={styles.label}>{label}</span>
    </NextLink>
  );
}
