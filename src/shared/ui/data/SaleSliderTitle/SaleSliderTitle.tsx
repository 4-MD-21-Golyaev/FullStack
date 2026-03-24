import styles from './SaleSliderTitle.module.css';

interface SaleSliderTitleProps {
  title: string;
  imageSrc?: string;
  className?: string;
}

export function SaleSliderTitle({ title, imageSrc, className }: SaleSliderTitleProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      {imageSrc && <img src={imageSrc} alt="" className={styles.cardImage} aria-hidden />}
      <span className={styles.cardTitle}>{title}</span>
    </div>
  );
}
