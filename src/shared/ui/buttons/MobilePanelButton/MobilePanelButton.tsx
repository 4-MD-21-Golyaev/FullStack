'use client';
import { Icon } from '../../icons/Icon/Icon';
import type { IconName } from '../../icons/Icon/Icon';
import styles from './MobilePanelButton.module.css';

type MobilePanelButtonState = 'enabled' | 'focused' | 'activated';

interface MobilePanelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  state?: MobilePanelButtonState;
}

export function MobilePanelButton({
  icon,
  state = 'enabled',
  className,
  ...rest
}: MobilePanelButtonProps) {
  return (
    <button
      type="button"
      className={[styles.root, styles[state], className ?? ''].join(' ').trim()}
      {...rest}
    >
      <Icon name={icon} size={26} />
    </button>
  );
}
