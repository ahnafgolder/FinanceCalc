'use client';
import { useState, useEffect } from 'react';
import { cachedFetch, getCachedData, invalidateCache } from '@/lib/fetchCache';
import { useLanguage } from '@/components/LanguageContext';

export default function PaymentsPage() {
  const [payments, setPayments] = useState(() => getCachedData('/api/payments') || []);
  const [loading, setLoading] = useState(payments.length === 0);
  const { t, fmt, fmtDate } = useLanguage();

  const fetchData = () => cachedFetch('/api/payments').then(d => { setPayments(d); setLoading(false); });
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm(t('accountHolderDetail.deletePaymentConfirm'))) return;
    await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    invalidateCache('/api/payments');
    invalidateCache('/api/dashboard');
    invalidateCache('/api/bills');
    setLoading(true);
    fetchData();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('payments.title')}</h2>
          <p>{t('payments.subtitle')} — {t('payments.total')}: {fmt(total)}</p>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('common.type')}</th>
                  <th>{t('dashboard.account')}</th>
                  <th>{t('bills.billNumber')}</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('payments.method')}</th>
                  <th>{t('payments.reference')}</th>
                  <th>{t('common.description')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p._id}>
                    <td>{fmtDate(p.paymentDate)}</td>
                    <td><span className={`badge badge-${p.type === 'received' ? 'success' : 'danger'}`}>{p.type === 'received' ? t('accountHolderDetail.payTypeR') : t('accountHolderDetail.payTypeP')}</span></td>
                    <td>{p.accountHolderId?.name || '—'}</td>
                    <td style={{ color: 'var(--accent)' }}>{p.billId?.billNumber || '—'}</td>
                    <td style={{ color: p.type === 'received' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{fmt(p.amount)}</td>
                    <td>{p.paymentMethod === 'cash' ? t('payments.cash') : (p.paymentMethod === 'bank_transfer' ? t('payments.bankTransfer') : (p.paymentMethod === 'cheque' ? t('payments.cheque') : (p.paymentMethod === 'mobile_banking' ? t('payments.mobile') : t('payments.other'))))}</td>
                    <td>{p.referenceNumber || '—'}</td>
                    <td>{p.note || '—'}</td>
                    <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p._id)} title={t('common.delete')}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">💰</div>
          <h3>{t('payments.noPayments')}</h3>
          <p>{t('payments.noPaymentsSub')}</p>
        </div>
      )}
    </>
  );
}
