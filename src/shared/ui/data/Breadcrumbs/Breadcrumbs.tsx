import NextLink from 'next/link';
import { Icon } from '../../icons/Icon/Icon';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbsProps {
  crumbs: BreadcrumbItem[];
  size?: 'L' | 'S';
  className?: string;
}

export function Breadcrumbs({ crumbs, size = 'L', className }: BreadcrumbsProps) {
  const items = crumbs.map((crumb, i) => (
    <span key={i} className={styles.item}>
      {i > 0 && <Icon name="arrow_right" size={10} className={styles.separator} />}
      <NextLink href={crumb.href} className={styles.link}>
        {crumb.label}
      </NextLink>
    </span>
  ));

  return (
    <nav
      className={[styles.breadcrumbs, styles[size], className].filter(Boolean).join(' ')}
      aria-label="Breadcrumb"
    >
      {size === 'S' ? <div className={styles.scrollable}>{items}</div> : items}
    </nav>
  );
}
