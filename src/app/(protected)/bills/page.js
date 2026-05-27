'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cachedFetch, getCachedData, invalidateCache } from '@/lib/fetchCache';
import { useLanguage } from '@/components/LanguageContext';

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState(() => getCachedData('/api/bills') || []);
  const [loading, setLoading] = useState(bills.length === 0);
  const [statusFilter, setStatusFilter] = useState('');
  const { t, fmt, fmtDate } = useLanguage();

  useEffect(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    const url = `/api/bills${params}`;
    cachedFetch(url).then(d => { setBills(d); setLoading(false); });
  }, [statusFilter]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('bills.title')}</h2>
          <p>{t('bills.subtitle')}</p>
        </div>
        <Link href="/bills/new" className="btn btn-primary">{t('bills.newBill')}</Link>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={statusFilter} onChange={e => { setLoading(true); setStatusFilter(e.target.value); }}>
          <option value="">{t('bills.allStatus')}</option>
          <option value="unpaid">{t('accountHolderDetail.statusUnpaid')}</option>
          <option value="partial">{t('accountHolderDetail.statusPartial')}</option>
          <option value="paid">{t('accountHolderDetail.statusPaid')}</option>
        </select>
      </div>

      {bills.length > 0 ? (
        <div className="card"><div className="table-container"><table>
          <thead>
            <tr>
              <th>{t('bills.billNumber')}</th>
              <th>{t('common.type')}</th>
              <th>{t('dashboard.account')}</th>
              <th>{t('common.description')}</th>
              <th>{t('common.amount')}</th>
              <th>{t('accountHolderDetail.dueDate')}</th>
              <th>{t('common.status')}</th>
              <th>{t('bills.created')}</th>
            </tr>
          </thead>
          <tbody>{bills.map(b => (
            <tr key={b._id} onClick={() => router.push(`/bills/${b._id}`)} style={{ cursor: 'pointer' }}>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{b.billNumber}</td>
              <td><span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`}>{b.type === 'receivable' ? t('accountHolderDetail.billTypeR') : t('accountHolderDetail.billTypeP')}</span></td>
              <td>{b.accountHolderId?.name || '—'}</td>
              <td>{b.description || '—'}</td>
              <td>{fmt(b.totalAmount)}</td>
              <td>{b.dueDate ? fmtDate(b.dueDate) : '—'}</td>
              <td><span className={`badge badge-${b.status}`}>{b.status === 'paid' ? t('accountHolderDetail.statusPaid') : (b.status === 'unpaid' ? t('accountHolderDetail.statusUnpaid') : t('accountHolderDetail.statusPartial'))}</span></td>
              <td>{fmtDate(b.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">📄</div>
          <h3>{t('bills.noBills')}</h3>
          <p>{t('bills.noBillsSub')}</p>
          <Link href="/bills/new" className="btn btn-primary">{t('bills.newBill')}</Link>
        </div>
      )}
    </>
  );
}
