'use client';

import Link from 'next/link';
import { Badge, CardImage, Counter, IconButton, LikeButton, Price } from '@/shared/ui';
import { useCart } from '@/app/(customer)/CartContext';
import styles from './ProductCard.module.css';

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  stock?: number;
  oldPrice?: number;
  discount?: string;
  onToggleLike?: () => void;
  liked?: boolean;
  size?: 'L' | 'S';
  className?: string;
}

function formatPrice(v: number) {
  return `${v.toLocaleString('ru-RU')} ₽`;
}

export default function ProductCard({
  id,
  slug,
  name,
  image,
  price,
  stock = 999,
  oldPrice,
  discount,
  onToggleLike,
  liked = false,
  size = 'L',
  className,
}: ProductCardProps) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const cartItem = items.find(i => i.productId === id);
  const inCart = !!cartItem;
  const quantity = cartItem?.quantity ?? 0;

  return (
    <div className={[styles.root, size === 'S' ? styles.sizeS : '', inCart ? styles.inCart : '', className ?? ''].filter(Boolean).join(' ')}>
      {/* Image area */}
      <Link href={`/catalog/product/${slug}`} className={styles.imageLink}>
        <CardImage src={image} alt={name} size={size === 'S' ? 'M' : 'L'} className={styles.cardImage} />
        {discount && (
          <span className={styles.discountBadge}>
            <Badge variant="discount" size="S">{discount}</Badge>
          </span>
        )}
      </Link>

      {/* Like button — top-right over image */}
      <LikeButton
        active={liked}
        onClick={onToggleLike}
        className={styles.likeButton}
        aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
      />

      {/* Info section */}
      <div className={styles.info}>
        {/* Title block: name + price (price moves here when in cart) */}
        <div className={styles.titleBlock}>
          <Link href={`/catalog/product/${slug}`} className={styles.nameLink}>
            <p className={styles.name}>{name}</p>
          </Link>

          {inCart && (
            <div className={styles.inCartPrice}>
              <span className={styles.inCartPriceActual}>{formatPrice(price * quantity)}</span>
              {oldPrice !== undefined && (
                <span className={styles.inCartPriceOld}>{formatPrice(oldPrice * quantity)}</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className={styles.bottom}>
          {!inCart && (
            <>
              <Price value={price} old={oldPrice} size="M" />
              <IconButton
                icon="cart"
                size="md"
                variant="red"
                onClick={() => addItem({ productId: id, name, price, imagePath: image, stock })}
                aria-label="Добавить в корзину"
                className={styles.cartButton}
              />
            </>
          )}

          {inCart && size === 'L' && (
            <div className={styles.controls}>
              <Counter
                value={quantity}
                onChange={qty => updateQuantity(id, qty)}
                min={1}
                size="sm"
                className={styles.counter}
              />
              <IconButton
                icon="delete"
                size="md"
                variant="white"
                onClick={() => removeItem(id)}
                aria-label="Удалить из корзины"
              />
            </div>
          )}

          {inCart && size === 'S' && (
            <Counter
              value={quantity}
              onChange={qty => updateQuantity(id, qty)}
              min={1}
              size="lg"
              className={styles.counterFull}
            />
          )}
        </div>
      </div>
    </div>
  );
}
