'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chips, ChipsRow, Container } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useCatalog } from './CatalogContext';
import styles from './CategoryHeader.module.css';

/**
 * Renders the page title + sibling chip tabs for /catalog/[categoryId] routes.
 * Lives in /catalog/layout.tsx so its DOM persists across sibling navigations,
 * letting the chip container preserve its scrollLeft. The container is always
 * mounted; visibility of chips is toggled via a data attribute, so neither
 * isMobile hydration nor the leaf/non-leaf flip causes a remount.
 */
export default function CategoryHeader() {
  const params = useParams();
  const categoryId = (params?.categoryId as string | undefined) ?? '';
  const { rootCategories, childrenByParent } = useCatalog();
  const router = useRouter();
  const isMobile = useIsMobile();

  const allCategories = useMemo(
    () => [...rootCategories, ...Object.values(childrenByParent).flat()],
    [rootCategories, childrenByParent],
  );

  const currentCategory = useMemo(
    () => allCategories.find(c => c.id === categoryId),
    [categoryId, allCategories],
  );

  const isLeaf = (childrenByParent[categoryId] ?? []).length === 0;

  const parentCategory = useMemo(() => {
    if (!currentCategory?.parentId) return null;
    return allCategories.find(c => c.id === currentCategory.parentId) ?? null;
  }, [currentCategory, allCategories]);

  const siblings = useMemo(() => {
    if (!currentCategory?.parentId) return [];
    return childrenByParent[currentCategory.parentId] ?? [];
  }, [currentCategory, childrenByParent]);

  const title = useMemo(() => {
    if (isLeaf && parentCategory) return parentCategory.name;
    return currentCategory?.name ?? 'Каталог';
  }, [isLeaf, parentCategory, currentCategory]);

  const showTabs = !!categoryId && isMobile && isLeaf && siblings.length > 1;
  const activeSiblingIndex = siblings.findIndex(s => s.id === categoryId);

  if (!categoryId) return null;

  return (
    <Container className={styles.root}>
      <h1 className={styles.title}>{title}</h1>
      <ChipsRow visible={showTabs} activeIndex={activeSiblingIndex}>
        {siblings.map(sib => (
          <Chips
            key={sib.id}
            size="sm"
            selected={sib.id === categoryId}
            onClick={() => router.push(`/catalog/${sib.id}`)}
          >
            {sib.name}
          </Chips>
        ))}
      </ChipsRow>
    </Container>
  );
}
