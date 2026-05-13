'use client';

import { SliderContainer } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useRelatedProducts } from '@/features/recommendations';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import { ProductCardSkeleton } from '@/widgets/customer/ProductCard/ProductCardSkeleton';
import styles from './RelatedProducts.module.css';

const RELATED_LIMIT = 6;

export interface RelatedProductsProps {
  productId: string;
}

export function RelatedProducts({ productId }: RelatedProductsProps) {
  const { data, loading } = useRelatedProducts(productId, RELATED_LIMIT);
  const isMobile = useIsMobile();
  const cardSize = isMobile ? 'S' : 'L';

  if (!loading && data.length === 0) {
    return null;
  }

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>С этим товаром покупают</h2>
      <SliderContainer>
        {loading
          ? Array.from({ length: RELATED_LIMIT }, (_, i) => <ProductCardSkeleton key={i} size={cardSize} />)
          : data.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.id}
                name={p.name}
                image={p.imagePath}
                price={p.price}
                stock={p.stock}
                size={cardSize}
              />
            ))}
      </SliderContainer>
    </section>
  );
}
