import { Spinner } from '../../feedback/Spinner/Spinner';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'tertiary';
type ButtonSize = 'sm' | 'md' | 'lg';

type CommonButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
};

type NativeButtonProps = CommonButtonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonButtonProps | 'href'> & {
  href?: undefined;
};

type AnchorButtonProps = CommonButtonProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonButtonProps> & {
  href: string;
};

type ButtonProps = NativeButtonProps | AnchorButtonProps;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const classNames = [
    styles.root,
    styles[variant],
    styles[size],
    loading ? styles.isLoading : '',
    className ?? '',
  ].join(' ').trim();

  if ('href' in rest && typeof rest.href === 'string') {
    const { href, onClick, ...anchorRest } = rest as AnchorButtonProps;
    const isDisabled = Boolean(disabled || loading);

    return (
      <a
        className={classNames}
        href={isDisabled ? undefined : href}
        aria-disabled={isDisabled}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        {...anchorRest}
      >
        {loading ? <Spinner size="sm" variant="current" /> : null}
        {children}
      </a>
    );
  }

  const buttonProps = rest as Omit<NativeButtonProps, keyof CommonButtonProps>;

  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? <Spinner size="sm" variant="current" /> : null}
      {children}
    </button>
  );
}
