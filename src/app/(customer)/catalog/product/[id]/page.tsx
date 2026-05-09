'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Container, Counter, LikeButton, Price, Spinner, Tab } from '@/shared/ui';
import { RelatedProducts } from '@/widgets/customer/RelatedProducts/RelatedProducts';
import { useCatalog, buildCategoryPath } from '../../CatalogContext';
import { useBreadcrumbs } from '../../../BreadcrumbsContext';
import { useCart } from '../../../CartContext';
import { useFavorites } from '../../../FavoritesContext';
import styles from './product.module.css';

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
  categoryId: string | null;
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const { rootCategories, childrenByParent } = useCatalog();
  const { setCustomCrumbs } = useBreadcrumbs();
  const { addItem, removeItem, updateQuantity, items } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'nutrition' | 'storage' | 'composition' | 'description'>('specs');

  useEffect(() => {
    if (!productId) return;
    let active = true;
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load products');
        return res.json();
      })
      .then((data: { products: ApiProduct[] } | ApiProduct[]) => {
        if (!active) return;
        const products = (data as { products?: ApiProduct[] }).products ?? (data as ApiProduct[]);
        const found = products.find(p => p.id === productId) ?? null;
        setProduct(found);
      })
      .catch(() => {
        if (!active) return;
        setProduct(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
      setLoading(true);
    };
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    const categoryPath = product.categoryId
      ? buildCategoryPath(product.categoryId, rootCategories, childrenByParent)
      : [];
    setCustomCrumbs([
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' },
      ...categoryPath.map(cat => ({ label: cat.name, href: `/catalog/${cat.id}` })),
      { label: product.name, href: `/catalog/product/${product.id}` },
    ]);
    return () => setCustomCrumbs(null);
  }, [product, rootCategories, childrenByParent, setCustomCrumbs]);

  const imageSrc = product?.imagePath ?? '/images/placeholder.png';
  const galleryImages = useMemo(() => [], []);
  const hasThumbnails = galleryImages.length > 0;
  const isLiked = product ? favoriteIds.has(product.id) : false;

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'nutrition':
        return 'Пищевая ценность будет доступна позже.';
      case 'storage':
        return 'Условия хранения будут доступны позже.';
      case 'composition':
        return 'Состав будет доступен позже.';
      case 'description':
        return 'Описание будет доступно позже.';
      case 'specs':
      default:
        return 'Характеристики будут доступны позже.';
    }
  }, [activeTab]);

  return (
    <div className={styles.page}>
      <Container className={styles.pageInner}>
        {loading && (
          <div className={styles.loading}>
            <Spinner />
          </div>
        )}

        {!loading && !product && (
          <div className={styles.empty}>Товар не найден</div>
        )}

        {!loading && product && (
          <div className={styles.layout}>
            <div className={`${styles.gallery}${hasThumbnails ? '' : ` ${styles.galleryNoThumbs}`}`}>
              {hasThumbnails && (
                <div className={styles.thumbnails}>
                  {galleryImages.map((src, index) => (
                    <Button key={src} variant="ghost" className={styles.thumb}>
                      <Image src={src} alt={product.name} fill sizes="72px" />
                      <span className={styles.thumbIndex}>{index + 1}</span>
                    </Button>
                  ))}
                </div>
              )}

              <div className={styles.mainImage}>
                <Image
                  src={imageSrc}
                  alt={product.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 480px"
                  className={styles.mainImageEl}
                />
              </div>
            </div>

            <div className={styles.info}>
              <h1 className={styles.title}>{product.name}</h1>

              <div className={styles.buyCard}>
                <Price value={product.price} size="L" />
                <div className={styles.actions}>
                  {(() => {
                    const cartItem = items.find(i => i.productId === product.id);
                    if (cartItem) {
                      return (
                        <Counter
                          size="lg"
                          variant="white"
                          fluid
                          value={cartItem.quantity}
                          min={0}
                          max={cartItem.stock}
                          onChange={qty => qty === 0
                            ? removeItem(product.id)
                            : updateQuantity(product.id, qty)
                          }
                          className={styles.counter}
                        />
                      );
                    }
                    return (
                      <Button
                        size="lg"
                        onClick={() => addItem({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          imagePath: product.imagePath,
                          stock: 999,
                        })}
                      >
                        В корзину
                      </Button>
                    );
                  })()}
                  <LikeButton
                    variant="white"
                    size="lg"
                    active={isLiked}
                    onClick={() => {
                      if (product) toggleFavorite(product.id);
                    }}
                    aria-label={isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
                  />
                </div>
              </div>

              <div className={styles.tabs}>
                <Tab active={activeTab === 'specs'} onClick={() => setActiveTab('specs')}>
                  Характеристики
                </Tab>
                <Tab active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')}>
                  Пищевая ценность
                </Tab>
                <Tab active={activeTab === 'storage'} onClick={() => setActiveTab('storage')}>
                  Хранение
                </Tab>
                <Tab active={activeTab === 'composition'} onClick={() => setActiveTab('composition')}>
                  Состав
                </Tab>
                <Tab active={activeTab === 'description'} onClick={() => setActiveTab('description')}>
                  Описание
                </Tab>
              </div>

              <div className={styles.tabContent}>
                {tabContent}
              </div>
            </div>
          </div>
        )}

        {!loading && product && (
          <div className={styles.related}>
            <RelatedProducts productId={product.id} />
          </div>
        )}
      </Container>
    </div>
  );
}
