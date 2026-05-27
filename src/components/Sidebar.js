'use client';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/account-holders', label: 'Account Holders', icon: '👥' },
  { href: '/bills', label: 'Bills', icon: '📄' },
  { href: '/payments', label: 'Payments', icon: '💰' },
  { href: '/reports', label: 'Reports', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || '?';
  const isAdmin = session?.user?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">FC</div>
        <h1>FinanceCalc</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <Link
            href="/users"
            className={`sidebar-link ${pathname.startsWith('/users') ? 'active' : ''}`}
          >
            <span className="icon">🛡️</span>
            Users
          </Link>
        )}

        <Link
          href="/settings"
          className={`sidebar-link ${pathname.startsWith('/settings') ? 'active' : ''}`}
        >
          <span className="icon">⚙️</span>
          Settings
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
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          style={{ marginTop: '8px', color: 'var(--danger)' }}
        >
          <span className="icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
