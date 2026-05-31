'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

function dueLabel(dueDate, t, fmtDate) {
  if (!dueDate) return '—';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} ${t('dashboard.daysOverdue')}`;
  if (diff === 0) return t('dashboard.dueToday');
  if (diff === 1) return t('dashboard.dueTomorrow');
  return fmtDate(dueDate);
}

function PersonRow({ person, amount, tone, onClick, sub }) {
  const { fmt } = useLanguage();
  return (
    <div className="action-row" onClick={onClick}>
      <div>
        <div className="action-row-name">{person.name}</div>
        {sub && <div className="action-row-sub">{sub}</div>}
      </div>
      <div className={`action-row-amount ${tone}`}>{fmt(amount)}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useCachedQuery('/api/dashboard');
  const { t, fmt, fmtDate } = useLanguage();
  const router = useRouter();

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const s = data?.stats || {};
  const owesMe = data?.owesMe || [];
  const iOwe = data?.iOwe || [];
  const dueThisWeek = data?.dueThisWeek || [];
  const overdueBills = data?.overdueBills || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <Link href="/account-holders" className="btn btn-primary">{t('accountHolders.newHolder')}</Link>
      </div>

      {overdueBills.length > 0 && (
        <div className="alert-banner">
          <span>⚠️</span>
          <span>
            <strong>{overdueBills.length} {t('dashboard.overdueBills')}</strong>
            {' — '}{t('dashboard.dueThisWeek').toLowerCase()}
          </span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-label">{t('dashboard.outstandingReceivables')}</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(s.outstandingReceivable)}</div>
          <div className="stat-sub">{t('dashboard.toBeCollected')}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">{t('dashboard.outstandingPayables')}</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(s.outstandingPayable)}</div>
          <div className="stat-sub">{t('dashboard.toBePaid')}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">{t('dashboard.totalCollected')}</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(s.totalCollected)}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">{t('dashboard.totalPaidOut')}</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(s.totalPaidOut)}</div>
        </div>
      </div>

      <div className="dashboard-split">
        <div className="card">
          <div className="section-header">
            <div>
              <h3>{t('dashboard.owesMe')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('dashboard.owesMeSub')}</p>
            </div>
          </div>
          {owesMe.length > 0 ? (
            <div className="action-list">
              {owesMe.slice(0, 8).map((p) => (
                <PersonRow
                  key={p._id}
                  person={p}
                  amount={p.amount}
                  tone="positive"
                  onClick={() => router.push(`/account-holders/${p._id}`)}
                  sub={p.phone || undefined}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', padding: '8px 0' }}>{t('dashboard.allClear')}</p>
          )}
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <h3>{t('dashboard.iOwe')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{t('dashboard.iOweSub')}</p>
            </div>
          </div>
          {iOwe.length > 0 ? (
            <div className="action-list">
              {iOwe.slice(0, 8).map((p) => (
                <PersonRow
                  key={p._id}
                  person={p}
                  amount={p.amount}
                  tone="negative"
                  onClick={() => router.push(`/account-holders/${p._id}`)}
                  sub={p.phone || undefined}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', padding: '8px 0' }}>{t('dashboard.allClear')}</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-header">
          <h3>{t('dashboard.dueThisWeek')}</h3>
          <Link href="/bills" className="btn btn-secondary btn-sm">{t('dashboard.viewAll')}</Link>
        </div>
        {dueThisWeek.length > 0 ? (
          <div className="action-list">
            {dueThisWeek.map((b) => {
              const isOverdue = b.dueDate && new Date(b.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <div
                  key={b._id}
                  className={`action-row ${isOverdue ? 'overdue' : ''}`}
                  onClick={() => router.push(`/bills/${b._id}`)}
                >
                  <div>
                    <div className="action-row-name">{b.accountHolderId?.name || '—'}</div>
                    <div className="action-row-sub">
                      {b.billNumber} · {dueLabel(b.dueDate, t, fmtDate)}
                    </div>
                  </div>
                  <div className="action-row-amount negative">{fmt(b.totalAmount)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', padding: '8px 0' }}>{t('dashboard.noDueThisWeek')}</p>
        )}
      </div>
    </>
  );
}
