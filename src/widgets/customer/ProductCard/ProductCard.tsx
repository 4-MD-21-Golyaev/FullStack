import Link from 'next/link';
import {Badge, CardImage, IconButton, LikeButton, Price} from '@/shared/ui';
import styles from './ProductCard.module.css';

export interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  discount?: string;
  inCart?: boolean;
  onAddToCart?: () => void;
  onToggleLike?: () => void;
  liked?: boolean;
  className?: string;
}

export default function ProductCard({
  slug,
  name,
  image,
  price,
  oldPrice,
  discount,
  inCart = false,
  onAddToCart,
  onToggleLike,
  liked = false,
  className,
}: ProductCardProps) {
  const rootClass = [styles.root, inCart ? styles.inCart : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {/* Image area — clickable, links to product page */}
      <Link href={`/catalog/${slug}`} className={styles.imageLink}>
        <CardImage src={image} alt={name} size="L" />
          {discount && (
            <span className={styles.discountBadge}>
              <Badge variant="discount" size="S">{discount}</Badge>
            </span>
          )}
      </Link>

      {/* Like button — overlays image, top-right corner */}
      <LikeButton
        active={liked}
        onClick={onToggleLike}
        className={styles.likeButton}
        aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
      />

      {/* Info area */}
      <div className={styles.info}>
        <Link href={`/catalog/${slug}`} className={styles.nameLink}>
          <p className={styles.name}>{name}</p>
        </Link>

        <div className={styles.bottom}>
          <Price value={price} old={oldPrice} size="M" />

          <IconButton
            icon="cart"
            size="md"
            variant={inCart ? 'gray' : 'red'}
            onClick={onAddToCart}
            aria-label={inCart ? 'Уже в корзине' : 'Добавить в корзину'}
            className={styles.cartButton}
          />
        </div>
      </div>
    </div>
  );
}
