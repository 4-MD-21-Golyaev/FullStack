import React from 'react';
import { Link, SliderContainer } from '@/shared/ui';
import { ProductCardSkeleton } from '@/widgets/customer/ProductCard/ProductCardSkeleton';
import styles from './SubcategoryList.module.css';

const SKELETON_COUNT = 5;

interface SubcategoryListProps {
  title: string;
  href: string;
  children?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function SubcategoryList({ title, href, children, loading, className }: SubcategoryListProps) {
  return (
    <section className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <Link href={href} size="S" showIcon>
          Смотреть все
        </Link>
      </div>
      <SliderContainer>
        {loading
          ? Array.from({ length: SKELETON_COUNT }, (_, i) => <ProductCardSkeleton key={i} />)
          : children}
      </SliderContainer>
    </section>
  );
}
