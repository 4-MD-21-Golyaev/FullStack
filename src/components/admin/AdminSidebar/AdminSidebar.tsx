'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  ShoppingBag,
  Settings,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { paymentsApi } from '@/lib/api/payments';
import styles from './AdminSidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

function usePaymentIssuesCount() {
  const { data } = useQuery({
    queryKey: ['admin', 'payment-issues'],
    queryFn: () => paymentsApi.adminIssues(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return data?.total ?? 0;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const issuesCount = usePaymentIssuesCount();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Заказы', href: '/admin/orders', icon: <Package size={18} /> },
    {
      label: 'Платежи',
      href: '/admin/payments/issues',
      icon: <CreditCard size={18} />,
      badge: issuesCount > 0 ? issuesCount : undefined,
    },
    { label: 'Пользователи', href: '/admin/users', icon: <Users size={18} /> },
    { label: 'Каталог', href: '/admin/catalog/products', icon: <ShoppingBag size={18} /> },
    { label: 'Задачи', href: '/admin/jobs', icon: <Settings size={18} /> },
    { label: 'Аудит', href: '/admin/audit', icon: <ClipboardList size={18} /> },
  ];

  return (
    <aside className={`${styles.root} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!collapsed && <span className={styles.logo}>Admin</span>}
        <button
          className={styles.toggle}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={styles.badge}>{item.badge}</span>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && (
                <span className={styles.badgeDot} />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
