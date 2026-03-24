'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumbs, type BreadcrumbItem } from '@/shared/ui';
import styles from './CustomerBreadcrumbs.module.css';

const LABELS: Record<string, string> = {
  catalog: 'Каталог',
  cart: 'Корзина',
  orders: 'Заказы',
  favorites: 'Избранное',
};

function labelFromSegment(segment: string) {
  return LABELS[segment] ?? decodeURIComponent(segment);
}

export default function CustomerBreadcrumbs() {
  const pathname = usePathname();

  if (!pathname || !pathname.startsWith('/catalog') || pathname === '/catalog') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [
    { label: 'Главная', href: '/' },
  ];

  let current = '';
  segments.forEach(seg => {
    current += `/${seg}`;
    crumbs.push({ label: labelFromSegment(seg), href: current });
  });

  return (
    <Breadcrumbs
      crumbs={crumbs}
      size="S"
      className={styles.root}
    />
  );
}
