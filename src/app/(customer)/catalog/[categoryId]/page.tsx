'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Category, Container, CardGrid } from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import { ProductCardSkeleton } from '@/widgets/customer/ProductCard/ProductCardSkeleton';
import CatalogSidebar from '@/widgets/customer/CatalogSidebar/CatalogSidebar';
import { SubcategoryList } from '@/widgets/customer/SubcategoryList/SubcategoryList';
import { usePersonalizedProductSort, type Product as RecProduct } from '@/features/recommendations';
import { useCatalog, buildCategoryPath } from '../CatalogContext';
import { useBreadcrumbs } from '../../BreadcrumbsContext';
import styles from './category.module.css';

const SKELETON_COUNT = 8;

type ApiProduct = RecProduct;

export default function CatalogCategoryPage() {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params?.categoryId ?? '';

  const { rootCategories, childrenByParent, expanded, toggleCategory } = useCatalog();
  const { setCustomCrumbs } = useBreadcrumbs();
  const isMobile = useIsMobile();

  const subcategories = useMemo(
    () => childrenByParent[categoryId] ?? [],
    [childrenByParent, categoryId],
  );
  const isLeafCategory = subcategories.length === 0;

  useEffect(() => {
    if (!categoryId) return;
    const categoryPath = buildCategoryPath(categoryId, rootCategories, childrenByParent);
    setCustomCrumbs([
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' },
      ...categoryPath.map(cat => ({ label: cat.name, href: `/catalog/${cat.id}` })),
    ]);
    return () => setCustomCrumbs(null);
  }, [categoryId, rootCategories, childrenByParent, setCustomCrumbs]);

  const [productsByCategory, setProductsByCategory] = useState<Record<string, ApiProduct[]>>({});
  const [categoryProducts, setCategoryProducts] = useState<ApiProduct[]>([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);

  const fetchProducts = useCallback(async (catId: string): Promise<ApiProduct[]> => {
    const res = await fetch(`/api/products?categoryId=${encodeURIComponent(catId)}&includeDescendants=true`);
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    return (data.products ?? data) as ApiProduct[];
  }, []);

  useEffect(() => {
    if (!categoryId || isLeafCategory) {
      return;
    }
    let active = true;
    Promise.all(subcategories.map(sc => fetchProducts(sc.id).catch(() => []))).then(results => {
      if (!active) return;
      const map: Record<string, ApiProduct[]> = {};
      results.forEach((items, i) => {
        map[subcategories[i].id] = items;
      });
      setProductsByCategory(map);
    });
    return () => {
      active = false;
    };
  }, [categoryId, subcategories, isLeafCategory, fetchProducts]);

  useEffect(() => {
    if (!categoryId || !isLeafCategory) {
      return;
    }
    let active = true;
    fetchProducts(categoryId)
      .then(items => {
        if (active) {
          setCategoryProducts(items);
          setCategoryProductsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setCategoryProducts([]);
          setCategoryProductsLoading(false);
        }
      });
    return () => {
      active = false;
      setCategoryProductsLoading(true);
    };
  }, [categoryId, isLeafCategory, fetchProducts]);

  const { sorted: sortedCategoryProducts } = usePersonalizedProductSort(
    categoryProducts,
    isLeafCategory ? categoryId : null,
  );

  return (
    <div className={styles.page}>
      <Container className={styles.pageInner}>
        <div className={styles.layout}>
          <CatalogSidebar
            className={styles.sidebar}
            categories={rootCategories}
            childrenByParent={childrenByParent}
            expanded={expanded}
            loading={false}
            onToggle={toggleCategory}
          />

          <div className={styles.content}>
            {!isLeafCategory && (
              <>
                <CardGrid mobileColumns={3}>
                  {subcategories.map(cat => (
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

                <div className={styles.sliders}>
                  {subcategories.map(sub => (
                    <SubcategoryList
                      key={sub.id}
                      title={sub.name}
                      href={`/catalog/${sub.id}`}
                      loading={!(sub.id in productsByCategory)}
                    >
                      {(productsByCategory[sub.id] ?? []).map(p => (
                        <ProductCard
                          key={p.id}
                          id={p.id}
                          slug={p.id}
                          name={p.name}
                          image={p.imagePath}
                          price={p.price}
                          size={isMobile ? 'S' : 'L'}
                        />
                      ))}
                    </SubcategoryList>
                  ))}
                </div>
              </>
            )}

            {isLeafCategory && (
              <>
                <CardGrid>
                  {categoryProductsLoading
                    ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <ProductCardSkeleton key={i} size={isMobile ? 'S' : 'L'} />
                      ))
                    : sortedCategoryProducts.map(p => (
                        <ProductCard
                          key={p.id}
                          id={p.id}
                          slug={p.id}
                          name={p.name}
                          image={p.imagePath ?? '/images/placeholder.png'}
                          price={p.price}
                          size={isMobile ? 'S' : 'L'}
                          fillWidth={isMobile}
                        />
                      ))}
                </CardGrid>
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
