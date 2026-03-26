'use client';

import { CardImage, Counter, LikeButton, IconButton } from '@/shared/ui';
import styles from './WideProductCard.module.css';

export interface WideProductCardProps {
  name: string;
  imageSrc: string;
  pricePerUnit: number;
  price: number;
  oldPrice?: number;
  quantity: number;
  inStock: boolean;
  liked?: boolean;
  onQuantityChange?: (qty: number) => void;
  onLike?: () => void;
  onRemove?: () => void;
  className?: string;
}

function formatPrice(v: number) {
  return `${v.toLocaleString('ru-RU')} ₽`;
}

export function WideProductCard({
  name,
  imageSrc,
  pricePerUnit,
  price,
  oldPrice,
  quantity,
  inStock,
  liked,
  onQuantityChange,
  onLike,
  onRemove,
  className,
}: WideProductCardProps) {
  return (
    <div className={[styles.root, className ?? ''].join(' ').trim()}>
      <div className={styles.info}>
        <CardImage src={imageSrc} alt={name} size="M" />
        <div className={styles.nameBlock}>
          <span className={styles.name}>{name}</span>
          {inStock ? (
            <span className={styles.meta}>{formatPrice(pricePerUnit)} за 1 шт</span>
          ) : (
            <span className={styles.outOfStockMeta}>Нет в наличии</span>
          )}
        </div>
      </div>

      {inStock && (
        <div className={styles.container}>
          <Counter
            value={quantity}
            onChange={onQuantityChange}
            min={1}
            className={styles.counter}
          />
          <div className={styles.priceCol}>
            <span className={styles.priceActual}>{formatPrice(price)}</span>
            {oldPrice !== undefined && (
              <span className={styles.priceOld}>{formatPrice(oldPrice)}</span>
            )}
          </div>
        </div>
      )}

      <div className={styles.buttons}>
        <LikeButton variant="white" active={liked} onClick={onLike} />
        <IconButton icon="delete" size="md" variant="white" onClick={onRemove} aria-label="Удалить товар" />
      </div>
    </div>
  );
}
