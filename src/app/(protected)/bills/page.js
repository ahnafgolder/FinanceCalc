'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

export default function BillsPage() {
  const router = useRouter();
  const { data: allBills, isLoading } = useCachedQuery('/api/bills');
  const [statusFilter, setStatusFilter] = useState('');
  const { t, fmt, fmtDate } = useLanguage();

  const bills = useMemo(() => {
    if (!allBills) return [];
    if (!statusFilter) return allBills;
    return allBills.filter((b) => b.status === statusFilter);
  }, [allBills, statusFilter]);

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('bills.title')}</h2>
          <p>{t('bills.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/bills/new" className="btn btn-primary">{t('bills.newBill')}</Link>
          <Link href="/bills/new?category=loan" className="btn btn-secondary">{t('loan.newLoan')}</Link>
        </div>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
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
              <th className="hide-mobile">{t('common.type')}</th>
              <th>{t('dashboard.account')}</th>
              <th className="hide-mobile">{t('common.description')}</th>
              <th>{t('common.amount')}</th>
              <th className="hide-mobile">{t('accountHolderDetail.dueDate')}</th>
              <th>{t('common.status')}</th>
              <th className="hide-mobile">{t('bills.created')}</th>
            </tr>
          </thead>
          <tbody>{bills.map(b => (
            <tr key={b._id} onClick={() => router.push(`/bills/${b._id}`)} style={{ cursor: 'pointer' }}>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{b.billNumber}</td>
              <td className="hide-mobile">
                {b.category === 'loan' && <span className="badge badge-loan" style={{ marginRight: '6px' }}>{t('loan.badge')}</span>}
                <span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`}>{b.type === 'receivable' ? t('accountHolderDetail.billTypeR') : t('accountHolderDetail.billTypeP')}</span>
              </td>
              <td>{b.accountHolderId?.name || '—'}</td>
              <td className="hide-mobile">{b.description || '—'}</td>
              <td>{fmt(b.totalAmount)}</td>
              <td className="hide-mobile">{b.dueDate ? fmtDate(b.dueDate) : '—'}</td>
              <td><span className={`badge badge-${b.status}`}>{b.status === 'paid' ? t('accountHolderDetail.statusPaid') : (b.status === 'unpaid' ? t('accountHolderDetail.statusUnpaid') : t('accountHolderDetail.statusPartial'))}</span></td>
              <td className="hide-mobile">{fmtDate(b.createdAt)}</td>
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
