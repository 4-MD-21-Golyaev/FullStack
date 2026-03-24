import Image from 'next/image';
import styles from './CardImage.module.css';

interface CardImageProps {
  src: string;
  alt?: string;
  size?: 'L' | 'M' | 'S';
  className?: string;
}

export function CardImage({ src, alt = '', size = 'L', className }: CardImageProps) {
  return (
    <div className={[styles.root, styles[`size${size}`], className].filter(Boolean).join(' ')}>
      <Image
        src={src}
        alt={alt}
        fill
        className={styles.image}
        sizes={
          size === 'L'
            ? '210px'
            : size === 'M'
              ? '60px'
              : '52px'
        }
      />
    </div>
  );
}
