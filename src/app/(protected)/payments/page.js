'use client';
import { afterDataMutation } from '@/lib/fetchCache';
import { apiFetch } from '@/lib/api';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

export default function PaymentsPage() {
  const { data: payments, isLoading, refetch } = useCachedQuery('/api/payments');
  const { t, fmt, fmtDate } = useLanguage();

  const handleDelete = async (id) => {
    if (!confirm(t('accountHolderDetail.deletePaymentConfirm'))) return;
    const payment = (payments || []).find((p) => p._id === id);
    const holderId = payment?.accountHolderId?._id || payment?.accountHolderId;
    await apiFetch(`/api/payments/${id}`, { method: 'DELETE' });
    await afterDataMutation({
      accountHolderId: holderId,
      deletedPaymentIds: [id],
    });
    refetch();
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const list = payments || [];
  const total = list.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('payments.title')}</h2>
          <p>{t('payments.subtitle')} — {t('payments.total')}: {fmt(total)}</p>
        </div>
      </div>

      {list.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th className="hide-mobile">{t('common.type')}</th>
                  <th>{t('dashboard.account')}</th>
                  <th className="hide-mobile">{t('bills.billNumber')}</th>
                  <th>{t('common.amount')}</th>
                  <th className="hide-mobile">{t('payments.method')}</th>
                  <th className="hide-mobile">{t('payments.reference')}</th>
                  <th className="hide-mobile">{t('common.description')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p._id}>
                    <td>{fmtDate(p.paymentDate)}</td>
                    <td className="hide-mobile"><span className={`badge badge-${p.type === 'received' ? 'success' : 'danger'}`}>{p.type === 'received' ? t('accountHolderDetail.payTypeR') : t('accountHolderDetail.payTypeP')}</span></td>
                    <td>{p.accountHolderId?.name || '—'}</td>
                    <td className="hide-mobile" style={{ color: 'var(--accent)' }}>{p.billId?.billNumber || '—'}</td>
                    <td style={{ color: p.type === 'received' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{fmt(p.amount)}</td>
                    <td className="hide-mobile">{p.paymentMethod === 'cash' ? t('payments.cash') : (p.paymentMethod === 'bank_transfer' ? t('payments.bankTransfer') : (p.paymentMethod === 'cheque' ? t('payments.cheque') : (p.paymentMethod === 'mobile_banking' ? t('payments.mobile') : t('payments.other'))))}</td>
                    <td className="hide-mobile">{p.referenceNumber || '—'}</td>
                    <td className="hide-mobile">{p.note || '—'}</td>
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
