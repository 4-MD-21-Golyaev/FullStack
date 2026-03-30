import { CardImage } from '../../data/CardImage/CardImage';
import { Price } from '../../data/Price/Price';
import styles from './NarrowProductCard.module.css';

export interface NarrowProductCardProps {
  name: string;
  imageSrc: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function NarrowProductCard({
  name,
  imageSrc,
  quantity,
  unitPrice,
  totalPrice,
}: NarrowProductCardProps) {
  return (
    <div className={styles.root}>
      <CardImage src={imageSrc} alt={name} size="S" />
      <div className={styles.content}>
        <span className={styles.name}>{name}</span>
        <div className={styles.bottom}>
          <span className={styles.qty}>
            {quantity} шт × {unitPrice.toLocaleString('ru-RU')} ₽
          </span>
          <Price value={totalPrice} size="M" />
        </div>
      </div>
    </div>
  );
}
