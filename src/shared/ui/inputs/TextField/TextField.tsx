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
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="4" cy="4" r="1.5" fill="#9c9999"/>
            <circle cx="8" cy="4" r="1.5" fill="#9c9999"/>
            <circle cx="4" cy="8" r="1.5" fill="#9c9999"/>
            <circle cx="8" cy="8" r="1.5" fill="#9c9999"/>
          </svg>
        </span>
      </div>
      {hint ? (
        <span className={[styles.hint, error ? styles.hintError : ''].join(' ').trim()}>{hint}</span>
      ) : null}
    </div>
  );
}
