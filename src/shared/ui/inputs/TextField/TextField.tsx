import { Icon } from '../../icons/Icon/Icon';
import styles from './TextField.module.css';

type TextFieldSize = 'lg' | 'md';

interface TextFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextFieldSize;
  label?: string;
  hint?: string;
  error?: boolean;
}

export function TextField({
  size = 'lg',
  label,
  hint,
  error = false,
  id,
  className,
  ...rest
}: TextFieldProps) {
  return (
    <div className={[styles.root, className ?? ''].join(' ').trim()}>
      {label ? <label className={styles.label} htmlFor={id}>{label}</label> : null}
      <div className={styles.wrapper}>
        <textarea
          id={id}
          className={[styles.textarea, styles[size], error ? styles.isError : ''].join(' ').trim()}
          {...rest}
        />
        <span className={styles.resizeIcon} aria-hidden>
          <Icon name="drag" size={12} color="currentColor" />
        </span>
      </div>
      {hint ? (
        <span className={[styles.hint, error ? styles.hintError : ''].join(' ').trim()}>{hint}</span>
      ) : null}
    </div>
  );
}
