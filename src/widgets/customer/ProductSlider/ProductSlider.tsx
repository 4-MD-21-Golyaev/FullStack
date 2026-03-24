'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import styles from './ProductSlider.module.css';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  oldPrice?: number;
  discount?: string;
  inCart?: boolean;
}

interface CategoryInfo {
  id: string;
  name: string;
  imagePath: string | null;
}

interface ProductSliderProps {
  category: CategoryInfo;
  products: Product[];
}

const SCROLL_STEP = 220;

export default function ProductSlider({ category, products }: ProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'prev' | 'next') => {
    trackRef.current?.scrollBy({
      left: direction === 'next' ? SCROLL_STEP : -SCROLL_STEP,
      behavior: 'smooth',
    });
  };

  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.categoryCard}>
            {category.imagePath ? (
              <img src={category.imagePath} alt={category.name} className={styles.categoryImage} />
            ) : (
              <div className={styles.categoryFallback} />
            )}
            <span className={styles.categoryName}>{category.name}</span>
          </div>

          <div className={styles.sliderWrapper}>
            <button
              className={[styles.navBtn, styles.navPrev].join(' ')}
              onClick={() => scroll('prev')}
              aria-label="Назад"
            >
              <ChevronLeft size={18} />
            </button>

            <div className={styles.track} ref={trackRef}>
              {products.length === 0 ? (
                <p className={styles.empty}>В этой категории пока нет товаров</p>
              ) : (
                products.map(p => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    slug={p.slug}
                    name={p.name}
                    price={p.price}
                    oldPrice={p.oldPrice}
                    discount={p.discount}
                    image={p.image}
                    inCart={p.inCart}
                  />
                ))
              )}
            </div>

            <button
              className={[styles.navBtn, styles.navNext].join(' ')}
              onClick={() => scroll('next')}
              aria-label="Вперёд"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}



