'use client';

import { SaleSliderTitle, SliderContainer } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import { ProductCardSkeleton } from '@/widgets/customer/ProductCard/ProductCardSkeleton';
import styles from './SaleSlider.module.css';

const SKELETON_COUNT = 5;

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface SaleSliderProps {
  title: string;
  imageSrc?: string | null;
  products: Product[];
  loading?: boolean;
}

export function SaleSlider({ title, imageSrc, products, loading }: SaleSliderProps) {
  const isMobile = useIsMobile();
  const cardSize = isMobile ? 'S' : 'L';

  return (
    <div className={styles.root}>
      <div className={styles.titleCol}>
        <SaleSliderTitle title={title} imageSrc={imageSrc ?? undefined} />
      </div>
      <div className={styles.trackCol}>
        <SliderContainer>
          {loading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => <ProductCardSkeleton key={i} />)
            : products.map(p => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  slug={p.id}
                  name={p.name}
                  price={p.price}
                  image={p.imagePath}
                  size={cardSize}
                />
              ))}
        </SliderContainer>
      </div>
    </div>
  );
}
