'use client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signOutAndClearCache } from '@/lib/authClient';
import Link from 'next/link';
import { useLanguage } from './LanguageContext';

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: '📊' },
  { href: '/account-holders', key: 'accountHolders', icon: '👥' },
  { href: '/bills', key: 'bills', icon: '📄' },
  { href: '/payments', key: 'payments', icon: '💰' },
  { href: '/reports', key: 'reports', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || '?';
  const isAdmin = session?.user?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">FC</div>
        <h1>{t('sidebar.logo')}</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {t(`sidebar.${item.key}`)}
          </Link>
        ))}

        {isAdmin && (
          <Link
            href="/users"
            className={`sidebar-link ${pathname.startsWith('/users') ? 'active' : ''}`}
          >
            <span className="icon">🛡️</span>
            {t('sidebar.users')}
          </Link>
        )}

        <Link
          href="/settings"
          className={`sidebar-link ${pathname.startsWith('/settings') ? 'active' : ''}`}
        >
          <span className="icon">⚙️</span>
          {t('sidebar.settings')}
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{userInitial}</div>
          <div className="user-info">
            <div className="user-name">{session?.user?.name || 'User'}</div>
            <div className="user-email">{session?.user?.email || ''}</div>
          </div>
        </div>
        <button
          className="sidebar-link"
          onClick={() => signOutAndClearCache({ callbackUrl: '/auth/signin' })}
          style={{ marginTop: '8px', color: 'var(--danger)' }}
        >
          <span className="icon">🚪</span>
          {t('sidebar.signOut')}
        </button>
      </div>
    </aside>
  );
}
