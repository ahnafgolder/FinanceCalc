'use client';
import Link from 'next/link';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

export default function Dashboard() {
  const { data, isLoading } = useCachedQuery('/api/dashboard');
  const { t, fmt, fmtDate } = useLanguage();

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const s = data?.stats || {};

  const getStatusLabel = (status) => {
    if (status === 'paid') return t('accountHolderDetail.statusPaid');
    if (status === 'unpaid') return t('accountHolderDetail.statusUnpaid');
    if (status === 'partial') return t('accountHolderDetail.statusPartial');
    return status;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <p>{t('dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-label">{t('dashboard.totalCollected')}</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(s.totalCollected)}</div>
          <div className="stat-sub">{t('dashboard.moneyReceived')}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">{t('dashboard.totalPaidOut')}</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(s.totalPaidOut)}</div>
          <div className="stat-sub">{t('dashboard.moneySent')}</div>
        </div>
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
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="section-header">
            <h3>{t('dashboard.recentBills')}</h3>
            <Link href="/bills" className="btn btn-secondary btn-sm">{t('dashboard.viewAll')}</Link>
          </div>
          {data?.recentBills?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('dashboard.billNo')}</th>
                    <th>{t('dashboard.account')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBills.map(b => (
                    <tr key={b._id}>
                      <td><Link href={`/bills/${b._id}`} style={{ color: 'var(--accent)' }}>{b.billNumber}</Link></td>
                      <td>{b.accountHolderId?.name || '—'}</td>
                      <td>{fmt(b.totalAmount)}</td>
                      <td><span className={`badge badge-${b.status}`}>{getStatusLabel(b.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ padding: '16px', color: 'var(--text-muted)' }}>{t('common.noData')}</p>}
        </div>

        <div className="card">
          <div className="section-header">
            <h3>{t('dashboard.recentPayments')}</h3>
            <Link href="/payments" className="btn btn-secondary btn-sm">{t('dashboard.viewAll')}</Link>
          </div>
          {data?.recentPayments?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('dashboard.account')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('bills.billNumber')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map(p => (
                    <tr key={p._id}>
                      <td>{p.accountHolderId?.name || '—'}</td>
                      <td style={{ color: 'var(--success)' }}>{fmt(p.amount)}</td>
                      <td>{p.billId?.billNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ padding: '16px', color: 'var(--text-muted)' }}>{t('common.noData')}</p>}
        </div>
      </div>
    </>
  );
}
