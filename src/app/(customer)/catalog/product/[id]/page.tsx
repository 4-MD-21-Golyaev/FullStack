'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, LikeButton, Price, Spinner, Tab } from '@/shared/ui';
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

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'nutrition' | 'storage' | 'composition' | 'description'>('specs');

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setLoading(true);
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load products');
        return res.json() as Promise<ApiProduct[]>;
      })
      .then(products => {
        if (!active) return;
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
    };
  }, [productId]);

  const imageSrc = product?.imagePath ?? '/images/placeholder.png';
  const galleryImages = useMemo(() => [], []);
  const hasThumbnails = galleryImages.length > 0;

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
      <div className={styles.container}>
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
                    <button key={src} className={styles.thumb} type="button">
                      <Image src={src} alt={product.name} fill sizes="72px" />
                      <span className={styles.thumbIndex}>{index + 1}</span>
                    </button>
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
                  <Button size="lg">В корзину</Button>
                  <LikeButton variant="white" size="lg" aria-label="Добавить в избранное" />
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
      </div>
    </div>
  );
}
