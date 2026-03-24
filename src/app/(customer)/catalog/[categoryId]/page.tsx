'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Category, SaleSliderTitle, SliderContainer } from '@/shared/ui';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import CatalogSidebar from '@/widgets/customer/CatalogSidebar/CatalogSidebar';
import styles from './category.module.css';

interface ApiCategory {
  id: string;
  name: string;
  imagePath: string | null;
  parentId: string | null;
}

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

type ChildrenMap = Record<string, ApiCategory[]>;

export default function CatalogCategoryPage() {
  const params = useParams<{ categoryId: string }>();
  const categoryId = params?.categoryId;

  const [rootCategories, setRootCategories] = useState<ApiCategory[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<ChildrenMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subcategories, setSubcategories] = useState<ApiCategory[]>([]);
  const [subcategoriesLoaded, setSubcategoriesLoaded] = useState(false);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, ApiProduct[]>>({});
  const [categoryProducts, setCategoryProducts] = useState<ApiProduct[]>([]);
  const [currentCategoryName, setCurrentCategoryName] = useState<string>('');
  const [loadingRoot, setLoadingRoot] = useState(true);

  const fetchCategories = useCallback(async (parentId?: string | null) => {
    const url = parentId
      ? `/api/categories?parentId=${encodeURIComponent(parentId)}`
      : '/api/categories';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load categories');
    return (await res.json()) as ApiCategory[];
  }, []);

  const fetchProducts = useCallback(async (catId: string) => {
    const res = await fetch(`/api/products?categoryId=${encodeURIComponent(catId)}`);
    if (!res.ok) throw new Error('Failed to load products');
    return (await res.json()) as ApiProduct[];
  }, []);

  useEffect(() => {
    setCurrentCategoryName('');
  }, [categoryId]);

  useEffect(() => {
    let active = true;
    setLoadingRoot(true);
    fetchCategories(null)
      .then(data => {
        if (!active) return;
        setRootCategories(data);
      })
      .catch(() => {
        if (!active) return;
        setRootCategories([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingRoot(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCategories]);

  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    setSubcategoriesLoaded(false);
    fetchCategories(categoryId)
      .then(children => {
        if (!active) return;
        setSubcategories(children);
        setChildrenByParent(prev => ({ ...prev, [categoryId]: children }));
        setExpanded(prev => ({ ...prev, [categoryId]: true }));
        setSubcategoriesLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setSubcategories([]);
        setSubcategoriesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [categoryId, fetchCategories]);

  useEffect(() => {
    if (!subcategoriesLoaded) return;
    if (subcategories.length === 0) {
      setProductsByCategory({});
      return;
    }
    let active = true;
    Promise.all(subcategories.map(sc => fetchProducts(sc.id).catch(() => [])))
      .then(results => {
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
  }, [subcategories, subcategoriesLoaded, fetchProducts]);

  const isLeafCategory = subcategoriesLoaded && subcategories.length === 0;

  useEffect(() => {
    if (!categoryId || !isLeafCategory) {
      setCategoryProducts([]);
      return;
    }
    let active = true;
    fetchProducts(categoryId)
      .then(items => {
        if (!active) return;
        setCategoryProducts(items);
      })
      .catch(() => {
        if (!active) return;
        setCategoryProducts([]);
      });
    return () => {
      active = false;
    };
  }, [categoryId, isLeafCategory, fetchProducts]);

  const toggleCategory = useCallback(
    async (id: string) => {
      setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
      if (childrenByParent[id]) return;
      try {
        const children = await fetchCategories(id);
        setChildrenByParent(prev => ({ ...prev, [id]: children }));
      } catch {
        setChildrenByParent(prev => ({ ...prev, [id]: [] }));
      }
    },
    [childrenByParent, fetchCategories],
  );

  useEffect(() => {
    if (!categoryId) return;
    if (currentCategoryName) return;
    const rootMatch = rootCategories.find(cat => cat.id === categoryId);
    if (rootMatch) {
      setCurrentCategoryName(rootMatch.name);
      return;
    }
    const childrenMatch = Object.values(childrenByParent)
      .flat()
      .find(cat => cat.id === categoryId);
    if (childrenMatch) {
      setCurrentCategoryName(childrenMatch.name);
      return;
    }
    if (rootCategories.length === 0) return;
    let active = true;
    Promise.all(rootCategories.map(root => fetchCategories(root.id).catch(() => [])))
      .then(results => {
        if (!active) return;
        const nextMap: ChildrenMap = {};
        results.forEach((items, index) => {
          nextMap[rootCategories[index].id] = items;
        });
        setChildrenByParent(prev => ({ ...nextMap, ...prev }));
        const resolved = results.flat().find(cat => cat.id === categoryId);
        if (resolved) {
          setCurrentCategoryName(resolved.name);
        }
      });
    return () => {
      active = false;
    };
  }, [categoryId, currentCategoryName, rootCategories, childrenByParent, fetchCategories]);

  const gridCategories = useMemo(() => subcategories, [subcategories]);
  const pageTitle = isLeafCategory ? currentCategoryName || 'Каталог' : 'Каталог';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={isLeafCategory ? styles.categoryTitle : styles.title}>{pageTitle}</h1>

        <div className={styles.layout}>
          <CatalogSidebar
            className={styles.sidebar}
            categories={rootCategories}
            childrenByParent={childrenByParent}
            expanded={expanded}
            loading={loadingRoot}
            onToggle={toggleCategory}
          />

          <div className={styles.content}>
            {!isLeafCategory && (
              <>
                <section className={styles.grid}>
                  {gridCategories.map(cat => (
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

                <div className={styles.sliders}>
                  {subcategories.map(sub => {
                    const items = productsByCategory[sub.id] ?? [];
                    return (
                      <section key={sub.id} className={styles.sliderSection}>
                        <SaleSliderTitle
                          title={sub.name}
                          href={`/catalog/${sub.id}`}
                          linkLabel="Посмотреть все товары"
                          className={styles.sliderTitle}
                        />
                        <SliderContainer>
                          {items.map(p => (
                            <ProductCard
                              key={p.id}
                              id={p.id}
                              slug={`product/${p.id}`}
                              name={p.name}
                              image={p.imagePath ?? '/images/placeholder.png'}
                              price={p.price}
                            />
                          ))}
                        </SliderContainer>
                      </section>
                    );
                  })}
                </div>
              </>
            )}

            {isLeafCategory && (
              <section className={styles.productGrid}>
                {categoryProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    slug={`product/${p.id}`}
                    name={p.name}
                    image={p.imagePath ?? '/images/placeholder.png'}
                    price={p.price}
                  />
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
