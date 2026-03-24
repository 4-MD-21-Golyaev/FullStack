import { Link } from '../../buttons/Link/Link';
import styles from './SaleSliderTitle.module.css';

interface SaleSliderTitleProps {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SaleSliderTitle({
  title,
  href,
  linkLabel = 'Смотреть все',
  className,
}: SaleSliderTitleProps) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      {href && (
        <Link href={href} size="S" showIcon>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
