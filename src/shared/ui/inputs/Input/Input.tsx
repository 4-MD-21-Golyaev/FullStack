import { InputBase, type InputBaseProps } from '../InputBase/InputBase';
import styles from './Input.module.css';

interface InputProps extends InputBaseProps {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, error = false, id, className, ...rest }: InputProps) {
  return (
    <div className={styles.root}>
      {label ? <label className={styles.label} htmlFor={id}>{label}</label> : null}
      <InputBase id={id} error={error} {...rest} />
      {hint ? <span className={[styles.hint, error ? styles.hintError : ''].join(' ').trim()}>{hint}</span> : null}
    </div>
  );
}
