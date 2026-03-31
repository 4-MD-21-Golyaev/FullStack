'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/shared/ui';
import { SaleSlider } from '@/widgets/customer/SaleSlider/SaleSlider';
import styles from './home.module.css';

/* ── Category sliders ── */

const CATEGORY_IDS = ['bakaleya', 'vypechka', 'zootovary'];

interface ApiCategory {
  id: string;
  name: string;
  imagePath?: string | null;
}

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface SliderData {
  id: string;
  name: string;
  imagePath: string | null;
  products: ApiProduct[];
}

async function fetchSliderData(id: string): Promise<SliderData> {
  const [catRes, productsRes] = await Promise.all([
    fetch(`/api/categories/${id}`),
    fetch(`/api/products?categoryId=${encodeURIComponent(id)}&includeDescendants=true`),
  ]);
  const cat: ApiCategory = catRes.ok ? await catRes.json() : { id, name: id };
  const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
  const products: ApiProduct[] = productsData.products ?? [];
  return { id, name: cat.name, imagePath: cat.imagePath ?? null, products };
}

/* ── Page ── */

export default function HomePage() {
  const [sliderMap, setSliderMap] = useState<Record<string, SliderData>>({});

  useEffect(() => {
    Promise.all(CATEGORY_IDS.map(fetchSliderData)).then(results => {
      const map: Record<string, SliderData> = {};
      results.forEach(s => { map[s.id] = s; });
      setSliderMap(map);
    });
  }, []);

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
        {CATEGORY_IDS.map(id => {
          const data = sliderMap[id];
          return (
            <section key={id} className={styles.sliderSection}>
              <Container>
                <SaleSlider
                  title={data?.name ?? ''}
                  imageSrc={data?.imagePath}
                  products={data?.products ?? []}
                  loading={!data}
                />
              </Container>
            </section>
          );
        })}
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
