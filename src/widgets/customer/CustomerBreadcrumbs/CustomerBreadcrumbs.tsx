'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumbs, type BreadcrumbItem } from '@/shared/ui';
import { useBreadcrumbs } from '@/app/(customer)/BreadcrumbsContext';

const SEGMENT_LABELS: Record<string, string> = {
  catalog: 'Каталог',
  cart: 'Корзина',
  orders: 'Заказы',
  favorites: 'Избранное',
  product: 'Товар',
};

function buildCrumbsFromPathname(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: 'Главная', href: '/' }];
  let current = '';
  segments.forEach(seg => {
    current += `/${seg}`;
    crumbs.push({
      label: SEGMENT_LABELS[seg] ?? decodeURIComponent(seg),
      href: current,
    });
  });
  return crumbs;
}

export default function CustomerBreadcrumbs() {
  const pathname = usePathname();
  const { customCrumbs } = useBreadcrumbs();

  if (!pathname || pathname === '/' || pathname === '/catalog') {
    return null;
  }

  const crumbs = customCrumbs ?? buildCrumbsFromPathname(pathname);

  return <Breadcrumbs crumbs={crumbs} size="L" />;
}
