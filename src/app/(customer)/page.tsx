'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/shared/ui';
import { SaleSlider } from '@/widgets/customer/SaleSlider/SaleSlider';
import { useTopCategories } from '@/features/recommendations';
import styles from './home.module.css';

/* ── Category sliders ── */

const SKELETON_SLIDER_COUNT = 3;

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

async function fetchCategoryProducts(id: string): Promise<ApiProduct[]> {
  const res = await fetch(`/api/products?categoryId=${encodeURIComponent(id)}&includeDescendants=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products ?? []) as ApiProduct[];
}

/* ── Page ── */

export default function HomePage() {
  const { data: topCategories, loading: categoriesLoading } = useTopCategories(3);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, ApiProduct[]>>({});

  useEffect(() => {
    if (topCategories.length === 0) {
      return;
    }
    let cancelled = false;
    Promise.all(topCategories.map(cat => fetchCategoryProducts(cat.id))).then(results => {
      if (cancelled) return;
      const map: Record<string, ApiProduct[]> = {};
      results.forEach((items, i) => {
        map[topCategories[i].id] = items;
      });
      setProductsByCategory(map);
    });
    return () => {
      cancelled = true;
    };
  }, [topCategories]);

  return (
    <div className={styles.page}>

      {/* ── 1. Hero ── */}
      {/* <section className={styles.hero}>
        <Container>
          <div className={styles.heroInner}>

            <div
              className={styles.heroSlide}
              style={{ backgroundColor: slide.color }}
              aria-label={`Слайд ${activeSlide + 1} из ${HERO_SLIDES.length}`}
            >
              <div className={styles.heroSlideContent}>
                <p className={styles.heroSlideTitle}>{slide.title}</p>
                <p className={styles.heroSlideSubtitle}>{slide.subtitle}</p>
              </div>
            </div>

            <ArrowsContainer
              className={styles.heroArrows}
              size="md"
              onPrev={prev}
              onNext={next}
            />

            <div className={styles.heroPagination}>
              <Pagination
                count={HERO_SLIDES.length}
                active={activeSlide}
                onSelect={goTo}
              />
            </div>
          </div>
        </Container>
      </section> */}

      {/* ── 2. Sale sliders ── */}
      <div className={styles.sliders}>
        {categoriesLoading
          ? Array.from({ length: SKELETON_SLIDER_COUNT }, (_, i) => (
              <section key={`skeleton-${i}`} className={styles.sliderSection}>
                <Container>
                  <SaleSlider title="" products={[]} loading />
                </Container>
              </section>
            ))
          : topCategories.map(cat => (
              <section key={cat.id} className={styles.sliderSection}>
                <Container>
                  <SaleSlider
                    title={cat.name}
                    imageSrc={cat.imagePath}
                    products={productsByCategory[cat.id] ?? []}
                    loading={!(cat.id in productsByCategory)}
                  />
                </Container>
              </section>
            ))}
      </div>

      {/* ── 3. Loyalty ── */}
      {/* <section className={styles.loyalty}>
        <Container>
          <div className={styles.loyaltyInner}>
            <h2 className={styles.loyaltyHeading}>Единая программа лояльности</h2>

            <div className={styles.loyaltyBody}>
              <div className={styles.loyaltyPhoneStub} aria-hidden />

              <div className={styles.loyaltyContent}>
                <ul className={styles.loyaltyBenefits}>
                  {BENEFITS.map(text => (
                    <li key={text} className={styles.loyaltyBenefitItem}>
                      <span className={styles.loyaltyCheckIcon} aria-hidden>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="#" className={styles.loyaltyDetailsLink}>Подробнее о программе</Link>
              </div>
            </div>

            <div className={styles.loyaltyApp}>
              <h3 className={styles.loyaltyAppHeading}>Один шаг до выгодных покупок</h3>
              <p className={styles.loyaltyAppSub}>
                Скачайте приложение и управляйте заказами и бонусами в пару касаний
              </p>
              <div className={styles.loyaltyAppButtons}>
                <AppMarketButton store="google-play" href="#" />
                <AppMarketButton store="app-store"   href="#" />
                <AppMarketButton store="appgallery"  href="#" />
                <AppMarketButton store="rustore"     href="#" />
              </div>
            </div>
          </div>
        </Container>
      </section> */}

    </div>
  );
}
