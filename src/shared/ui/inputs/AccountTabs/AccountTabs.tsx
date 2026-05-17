'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/shared/ui';
import { AccountTab } from '@/shared/ui';
import { Button } from '@/shared/ui';
import styles from './AccountTabs.module.css';

export interface AccountTabsProps {
  activeTab?: 'orders';
  onLogout?: () => void;
  className?: string;
}

const tabs = [
  { id: 'orders' as const, label: 'История заказов', icon: 'cart' as const, href: '/orders' },
];

export function AccountTabs({ activeTab, onLogout, className }: AccountTabsProps) {
  const router = useRouter();

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.sections}>
        {tabs.map(tab => (
          <AccountTab
            key={tab.id}
            icon={<Icon name={tab.icon} size={20} />}
            active={activeTab === tab.id}
            onClick={() => router.push(tab.href)}
          >
            {tab.label}
          </AccountTab>
        ))}
      </div>
      {onLogout && (
        <Button variant="danger" className={styles.logoutButton} onClick={onLogout} size={"md"}>
            <Icon name={"exit"} size={20} />
          Выйти
        </Button>
      )}
    </div>
  );
}
