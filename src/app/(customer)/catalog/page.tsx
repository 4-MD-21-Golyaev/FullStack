'use client';

import { Category, Container, CardGrid } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import CatalogSidebar from '@/widgets/customer/CatalogSidebar/CatalogSidebar';
import { usePersonalizedCategorySort } from '@/features/recommendations';
import { useCatalog } from './CatalogContext';
import styles from './catalog.module.css';

export default function CatalogPage() {
  const { rootCategories, childrenByParent, expanded, toggleCategory } = useCatalog();
  const { sorted: sortedRootCategories } = usePersonalizedCategorySort(rootCategories);
  const isMobile = useIsMobile();

  return (
    <div className={styles.page}>
      <Container className={styles.pageInner}>
        <h1 className={styles.title}>Каталог</h1>

        <div className={styles.layout}>
          <CatalogSidebar
            className={styles.sidebar}
            categories={rootCategories}
            childrenByParent={childrenByParent}
            expanded={expanded}
            loading={false}
            onToggle={toggleCategory}
          />

          <CardGrid mobileColumns={3}>
            {sortedRootCategories.map(cat => (
              <Category
                key={cat.id}
                label={cat.name}
                href={`/catalog/${cat.id}`}
                imageSrc={cat.imagePath ?? undefined}
                imageAlt={cat.name}
                size={isMobile ? 'S' : 'L'}
              />
            ))}
          </CardGrid>
        </div>
      </Container>
    </div>
  );
}
