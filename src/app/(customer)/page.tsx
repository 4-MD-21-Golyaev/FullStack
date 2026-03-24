'use client';

import { useState } from 'react';
import {
  ArrowsContainer,
  Pagination,
  SaleSliderTitle,
  SliderContainer,
  AppMarketButton,
  Link,
} from '@/shared/ui';
import ProductCard from '@/widgets/customer/ProductCard/ProductCard';
import styles from './home.module.css';

/* ── Mock data ── */

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

interface MockProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: string;
  image: string;
}

const makeProduct = (
  id: string,
  name: string,
  price: number,
  oldPrice?: number,
  discount?: string,
): MockProduct => ({
  id,
  slug: `product-${id}`,
  name,
  price,
  oldPrice,
  discount,
  image: '/images/placeholder.png',
});

const SLIDERS: { title: string; href: string; products: MockProduct[] }[] = [
  {
    title: 'Хиты продаж',
    href: '/catalog?sort=popular',
    products: [
      makeProduct('1', 'Кимчи из пекинской капусты, 500 г', 380),
      makeProduct('2', 'Соевый соус Kikkoman, 1 л', 520, 640, '-19%'),
      makeProduct('3', 'Лапша удон, 200 г', 149),
      makeProduct('4', 'Мисо-паста красная, 300 г', 275, 310, '-11%'),
      makeProduct('5', 'Рис для суши Nishiki, 1 кг', 460),
      makeProduct('6', 'Кунжутное масло, 250 мл', 340, 390, '-13%'),
    ],
  },
  {
    title: 'Новинки',
    href: '/catalog?sort=new',
    products: [
      makeProduct('7', 'Кочудян острая паста, 500 г', 620),
      makeProduct('8', 'Тофу шёлковый, 400 г', 195),
      makeProduct('9', 'Водоросли нори, 10 листов', 230),
      makeProduct('10', 'Понзу соус с лимоном, 200 мл', 285),
      makeProduct('11', 'Рамен говяжий, 115 г', 175),
      makeProduct('12', 'Маринованный имбирь, 300 г', 210),
    ],
  },
  {
    title: 'Акции',
    href: '/catalog?sort=sale',
    products: [
      makeProduct('13', 'Терияки соус, 500 мл', 310, 420, '-26%'),
      makeProduct('14', 'Рисовый уксус, 400 мл', 199, 240, '-17%'),
      makeProduct('15', 'Вакамэ сушёные, 100 г', 290, 350, '-17%'),
      makeProduct('16', 'Тайский рыбный соус, 300 мл', 255, 320, '-20%'),
      makeProduct('17', 'Паста карри красная, 200 г', 340, 410, '-17%'),
      makeProduct('18', 'Чай Молочный Улун, 100 г', 480, 580, '-17%'),
    ],
  },
  {
    title: 'Рекомендуем',
    href: '/catalog?sort=recommended',
    products: [
      makeProduct('19', 'Бобы эдамаме замороженные, 400 г', 270),
      makeProduct('20', 'Чипсы из морской капусты, 60 г', 165),
      makeProduct('21', 'Маття порошок, 100 г', 890),
      makeProduct('22', 'Дайкон маринованный, 250 г', 220),
      makeProduct('23', 'Кунжут белый обжаренный, 100 г', 145),
      makeProduct('24', 'Сливовый соус, 260 г', 195),
    ],
  },
];

const BENEFITS = [
  'Накапливайте баллы с каждой покупки',
  'Оплачивайте до 30% стоимости заказа баллами',
  'Получайте персональные предложения и акции',
  'Приоритетная поддержка для участников программы',
];

/* ── Page ── */

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const goTo = (index: number) => setActiveSlide(index);
  const prev = () => setActiveSlide(i => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => setActiveSlide(i => (i + 1) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className={styles.page}>

      {/* ── 1. Hero ── */}
      <section className={styles.hero}>
        <div className={styles.section}>
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
        </div>
      </section>

      {/* ── 2. Sale sliders ── */}
      <div className={styles.sliders}>
        {SLIDERS.map(({ title, href, products }) => (
          <section key={title} className={styles.sliderSection}>
            <div className={styles.section}>
              <div className={styles.sliderRow}>
                <div className={styles.sliderTitleCol}>
                  <SaleSliderTitle title={title} href={href} />
                </div>
                <div className={styles.sliderTrackCol}>
                  <SliderContainer>
                    {products.map(p => (
                      <ProductCard
                        key={p.id}
                        id={p.id}
                        slug={p.slug}
                        name={p.name}
                        price={p.price}
                        oldPrice={p.oldPrice}
                        discount={p.discount}
                        image={p.image}
                      />
                    ))}
                  </SliderContainer>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── 3. Loyalty ── */}
      <section className={styles.loyalty}>
        <div className={styles.section}>
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
        </div>
      </section>

    </div>
  );
}
