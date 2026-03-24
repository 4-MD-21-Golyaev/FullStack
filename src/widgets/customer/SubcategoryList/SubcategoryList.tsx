import React from 'react';
import { Link, SliderContainer } from '@/shared/ui';
import styles from './SubcategoryList.module.css';

interface SubcategoryListProps {
  title: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SubcategoryList({ title, href, children, className }: SubcategoryListProps) {
  return (
    <section className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <Link href={href} size="S" showIcon>
          Смотреть все
        </Link>
      </div>
      <SliderContainer>{children}</SliderContainer>
    </section>
  );
}
