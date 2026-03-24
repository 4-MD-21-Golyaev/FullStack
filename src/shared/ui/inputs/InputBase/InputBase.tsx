import styles from './InputBase.module.css';

type InputBaseSize = 'sm' | 'md' | 'lg';
type InputBaseColor = 'gray' | 'white';

export interface InputBaseProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputBaseSize;
  color?: InputBaseColor;
  error?: boolean;
}

export function InputBase({ size = 'lg', color = 'gray', error = false, className, ...rest }: InputBaseProps) {
  return (
    <input
      className={[
        styles.root,
        styles[`size_${size}`],
        styles[`color_${color}`],
        error ? styles.isError : '',
        className ?? '',
      ].join(' ').trim()}
      {...rest}
    />
  );
}
