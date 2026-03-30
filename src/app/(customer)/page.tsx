'use client';

import { useEffect, useState } from 'react';
import {
  ArrowsContainer,
  Container,
  Pagination,
  AppMarketButton,
  Link,
} from '@/shared/ui';
import { SaleSlider } from '@/widgets/customer/SaleSlider/SaleSlider';
import styles from './home.module.css';

/* ── Hero slides ── */

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  color: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: '1',
    title: 'Вкус Азии',
    subtitle: 'Свежие продукты восточной кухни с доставкой на дом',
    color: 'var(--primitive-color-red-900)',
  },
  {
    id: '2',
    title: 'Новогодний стол',
    subtitle: 'Деликатесы и заготовки для праздничного застолья',
    color: 'var(--primitive-color-red-500)',
  },
  {
    id: '3',
    title: 'Скидки до 40%',
    subtitle: 'Еженедельные акции на популярные товары',
    color: 'var(--primitive-color-red-700)',
  },
];

/* ── Category sliders ── */

const CATEGORY_IDS = ['CAT-2-3', 'CAT-4-1-1', 'CAT-1-2-1'];

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

const BENEFITS = [
  'Накапливайте баллы с каждой покупки',
  'Оплачивайте до 30% стоимости заказа баллами',
  'Получайте персональные предложения и акции',
  'Приоритетная поддержка для участников программы',
];

/* ── Page ── */

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderMap, setSliderMap] = useState<Record<string, SliderData>>({});

  useEffect(() => {
    Promise.all(CATEGORY_IDS.map(fetchSliderData)).then(results => {
      const map: Record<string, SliderData> = {};
      results.forEach(s => { map[s.id] = s; });
      setSliderMap(map);
    });
  }, []);

  const goTo = (index: number) => setActiveSlide(index);
  const prev = () => setActiveSlide(i => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => setActiveSlide(i => (i + 1) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className={styles.page}>

      {/* ── 1. Hero ── */}
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroInner}>

            {/* Slide */}
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

            {/* Arrow buttons overlaid on slide (outside overflow hidden) */}
            <ArrowsContainer
              className={styles.heroArrows}
              size="md"
              onPrev={prev}
              onNext={next}
            />

            {/* Pagination dots */}
            <div className={styles.heroPagination}>
              <Pagination
                count={HERO_SLIDES.length}
                active={activeSlide}
                onSelect={goTo}
              />
            </div>
          </div>
        </Container>
      </section>

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
      <section className={styles.loyalty}>
        <Container>
          <div className={styles.loyaltyInner}>
            <h2 className={styles.loyaltyHeading}>Единая программа лояльности</h2>

            <div className={styles.loyaltyBody}>
              {/* Phone image placeholder */}
              <div className={styles.loyaltyPhoneStub} aria-hidden />

              <div className={styles.loyaltyContent}>
                <ul className={styles.loyaltyBenefits}>
                  {BENEFITS.map(text => (
                    <li key={text} className={styles.loyaltyBenefitItem}>
                      <span className={styles.loyaltyCheckIcon} aria-hidden>
                        {/* checkmark svg */}
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

            {/* App download */}
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
      </section>

    </div>
  );
}
