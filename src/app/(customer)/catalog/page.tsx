'use client';

import { Category, Container } from '@/shared/ui';
import CatalogSidebar from '@/widgets/customer/CatalogSidebar/CatalogSidebar';
import { useCatalog } from './CatalogContext';
import styles from './catalog.module.css';

export default function CatalogPage() {
  const { rootCategories, childrenByParent, expanded, toggleCategory } = useCatalog();

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

          <section className={styles.grid}>
            {rootCategories.map(cat => (
              <Category
                key={cat.id}
                label={cat.name}
                href={`/catalog/${cat.id}`}
                imageSrc={cat.imagePath ?? undefined}
                imageAlt={cat.name}
                size="L"
              />
            ))}
          </section>
        </div>
      </Container>
    </div>
  );
}
