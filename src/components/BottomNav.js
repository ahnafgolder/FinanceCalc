'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageContext';

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: '📊' },
  { href: '/account-holders', key: 'accountHolders', icon: '👥' },
  { href: '/bills', key: 'bills', icon: '📄' },
  { href: '/payments', key: 'payments', icon: '💰' },
  { href: '/settings', key: 'settings', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{t(`sidebar.${item.key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
