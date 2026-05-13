'use client';

import { CardImage } from '../CardImage/CardImage';
import { Counter } from '../../inputs/Counter/Counter';
import { LikeButton } from '../../buttons/LikeButton/LikeButton';
import { IconButton } from '../../buttons/IconButton/IconButton';
import styles from './WideProductCard.module.css';

export interface WideProductCardProps {
  name: string;
  imageSrc?: string | null;
  pricePerUnit: number;
  price: number;
  oldPrice?: number;
  quantity: number;
  inStock: boolean;
  liked?: boolean;
  variant?: 'cart' | 'history';
  onQuantityChange?: (qty: number) => void;
  onLike?: () => void;
  onRemove?: () => void;
  onAddToCart?: () => void;
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
  variant = 'cart',
  onQuantityChange,
  onLike,
  onRemove,
  onAddToCart,
  className,
}: WideProductCardProps) {
  const isHistory = variant === 'history';

  return (
    <div className={[styles.root, className ?? ''].join(' ').trim()}>
      <div className={styles.info}>
        <CardImage src={imageSrc} alt={name} size="M" />
        <div className={styles.nameBlock}>
          <span className={styles.name}>{name}</span>
          <span className={styles.meta}>{formatPrice(pricePerUnit)} за 1 шт</span>
        </div>
      </div>

      {isHistory ? (
        <div className={styles.historyPriceQty}>
          <span className={styles.priceActual}>{formatPrice(price)}</span>
          <span className={styles.historyDot}>·</span>
          <span className={styles.priceActual}>{quantity} шт</span>
        </div>
      ) : (
        <div className={styles.container}>
          {inStock && (
            <Counter
              value={quantity}
              onChange={onQuantityChange}
              min={1}
              className={styles.counter}
            />
          )}
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
        {isHistory ? (
          <IconButton icon="cart" size="md" variant="white" onClick={onAddToCart} aria-label="Добавить в корзину" />
        ) : (
          <IconButton icon="delete" size="md" variant="white" onClick={onRemove} aria-label="Удалить товар" />
        )}
      </div>
    </div>
  );
}
