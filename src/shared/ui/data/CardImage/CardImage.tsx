'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './CardImage.module.css';

interface CardImageProps {
  src?: string | null;
  alt?: string;
  size?: 'L' | 'M' | 'S';
  className?: string;
}

export function CardImage({ src, alt = '', size = 'L', className }: CardImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={[styles.root, styles[`size${size}`], className].filter(Boolean).join(' ')}>
      <div className={[styles.skeleton, loaded ? styles.skeletonHidden : ''].filter(Boolean).join(' ')} aria-hidden />
      <Image
        src={src || '/images/placeholder.svg'}
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
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}
