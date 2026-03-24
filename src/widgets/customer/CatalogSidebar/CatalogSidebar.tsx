'use client';

import { useRouter } from 'next/navigation';
import { CategoryNavItem } from '@/shared/ui';
import styles from './CatalogSidebar.module.css';

export interface CatalogSidebarCategory {
  id: string;
  name: string;
}

export interface CatalogSidebarProps {
  categories: CatalogSidebarCategory[];
  childrenByParent: Record<string, CatalogSidebarCategory[]>;
  expanded: Record<string, boolean>;
  loading?: boolean;
  onToggle: (categoryId: string) => void;
  className?: string;
}

export default function CatalogSidebar({
  categories,
  childrenByParent,
  expanded,
  loading = false,
  onToggle,
  className,
}: CatalogSidebarProps) {
  const router = useRouter();

  return (
    <aside className={[styles.sidebar, className ?? ''].join(' ').trim()}>
      {loading ? (
        <div className={styles.placeholder}>Загрузка категорий…</div>
      ) : (
        <div className={styles.navList}>
          {categories.map(cat => {
            const isExpanded = Boolean(expanded[cat.id]);
            const children = childrenByParent[cat.id] ?? [];
            const hasKnownChildren = Object.prototype.hasOwnProperty.call(childrenByParent, cat.id);
            const hasChildren = hasKnownChildren ? children.length > 0 : true;
            return (
              <div key={cat.id} className={styles.navGroup}>
                <CategoryNavItem
                  expanded={isExpanded}
                  onClick={() => {
                    if (hasChildren) {
                      onToggle(cat.id);
                    } else {
                      router.push(`/catalog/${cat.id}`);
                    }
                  }}
                  showChevron={hasChildren}
                >
                  {cat.name}
                </CategoryNavItem>

                {isExpanded && hasChildren && (
                  <div className={styles.navChildren}>
                    {children.map(child => (
                      <CategoryNavItem
                        key={child.id}
                        level={2}
                        showChevron={false}
                        onClick={() => router.push(`/catalog/${child.id}`)}
                      >
                        {child.name}
                      </CategoryNavItem>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
