import { Check } from 'lucide-react';
import styles from './LoyaltySection.module.css';

const BENEFITS = [
  'Накапливайте баллы с каждой покупки',
  'Оплачивайте до 30% стоимости заказа баллами',
  'Получайте персональные предложения и акции',
  'Приоритетная поддержка для участников программы',
];

const APP_BUTTONS = [
  { label: 'App Store', sub: 'Доступно в' },
  { label: 'Google Play', sub: 'Доступно в' },
  { label: 'AppGallery', sub: 'Доступно в' },
  { label: 'RuStore', sub: 'Доступно в' },
];

export default function LoyaltySection() {
  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Единая программа лояльности</h2>

        <div className={styles.mainRow}>
          <div className={styles.phoneStub} />

          <div className={styles.content}>
            <ul className={styles.benefits}>
              {BENEFITS.map((text, i) => (
                <li key={i} className={styles.benefitItem}>
                  <span className={styles.checkIcon}>
                    <Check size={16} />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <a href="#" className={styles.detailsLink}>Подробнее о программе</a>
          </div>
        </div>

        <div className={styles.appSection}>
          <h3 className={styles.appHeading}>Один шаг до выгодных покупок</h3>
          <p className={styles.appSub}>Скачайте приложение и управляйте заказами и бонусами в пару касаний</p>
          <div className={styles.appButtons}>
            {APP_BUTTONS.map(({ label, sub }) => (
              <button key={label} className={styles.appBtn}>
                <span className={styles.appBtnSub}>{sub}</span>
                <span className={styles.appBtnLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
