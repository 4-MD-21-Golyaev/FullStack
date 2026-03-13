import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  hint?: string;
}

export function Input({ error = false, label, hint, id, className, ...rest }: InputProps) {
  return (
    <div className={styles.root}>
      {label ? <label className={styles.label} htmlFor={id}>{label}</label> : null}
      <input
        id={id}
        className={[styles.input, error ? styles.isError : ''].join(' ').trim()}
        {...rest}
      />
      {hint ? <span className={[styles.hint, error ? styles.hintError : ''].join(' ').trim()}>{hint}</span> : null}
    </div>
  );
}
