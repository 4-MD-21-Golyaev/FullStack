import styles from './SocialButton.module.css';
import {Icon} from "@/shared/ui";

type SocialNetwork = 'whatsapp' | 'telegram' | 'vk';
type SocialButtonVariant = 'white' | 'gray';

const SOCIAL_ICONS: Record<SocialNetwork, React.ReactElement> = {
  whatsapp: (
    <Icon name="wa"/>
  ),
  telegram: (
      <Icon name="tg"/>
  ),
  vk: (
      <Icon name="vk"/>
  ),
};

interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  network: SocialNetwork;
  variant?: SocialButtonVariant;
}

export function SocialButton({ network, variant = 'white', className, ...rest }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={[styles.root, styles[variant], className ?? ''].join(' ').trim()}
      {...rest}
    >
      {SOCIAL_ICONS[network]}
    </button>
  );
}
