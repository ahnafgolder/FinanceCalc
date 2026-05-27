'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { invalidateCache } from '@/lib/fetchCache';

export default function BillDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const { t, fmt, fmtDate } = useLanguage();

  const fetchData = () => fetch(`/api/bills/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  useEffect(() => { fetchData(); }, [id]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount), billId: id, accountHolderId: data.bill.accountHolderId._id }),
    });
    if (res.ok) {
      setShowPayment(false);
      setPayForm({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
      setLoading(true);
      invalidateCache('/api/payments');
      invalidateCache('/api/bills');
      invalidateCache('/api/dashboard');
      invalidateCache('/api/account-holders');
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(t('accountHolderDetail.deleteBillConfirm'))) return;
    await fetch(`/api/bills/${id}`, { method: 'DELETE' });
    invalidateCache('/api/bills');
    invalidateCache('/api/dashboard');
    invalidateCache('/api/account-holders');
    router.push('/bills');
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data?.bill) return <div className="empty-state"><h3>{t('common.noData')}</h3></div>;

  const b = data.bill;
  const pct = b.totalAmount > 0 ? Math.min((data.totalPaid / b.totalAmount) * 100, 100) : 0;

  return (
    <>
      <div className="detail-header">
        <div>
          <Link href="/bills" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('billDetail.backLink')}</Link>
          <h2 style={{ marginTop: '8px' }}>{b.billNumber}</h2>
          <span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`} style={{ marginRight: '8px' }}>{b.type === 'receivable' ? t('accountHolderDetail.billTypeR') : t('accountHolderDetail.billTypeP')}</span>
          <span className={`badge badge-${b.status}`}>{b.status === 'paid' ? t('accountHolderDetail.statusPaid') : (b.status === 'unpaid' ? t('accountHolderDetail.statusUnpaid') : t('accountHolderDetail.statusPartial'))}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {b.status !== 'paid' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>
              💰 {b.type === 'receivable' ? t('billDetail.collectMoney') : t('billDetail.recordPayment')}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ {t('common.delete')}</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-label">{t('billDetail.billAmount')}</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(b.totalAmount)}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">{t('accountHolderDetail.totalCollected')}</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(data.totalPaid)}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">{t('accountHolderDetail.outstanding')}</div>
          <div className="stat-value" style={{ color: data.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(data.remaining)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('billDetail.progress')}</span>
          <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--success))', borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: '32px' }}>
        <div className="detail-item">
          <div className="detail-label">{t('dashboard.account')}</div>
          <div className="detail-value">
            <Link href={`/account-holders/${b.accountHolderId?._id}`} style={{ color: 'var(--accent)' }}>{b.accountHolderId?.name}</Link>
          </div>
        </div>
        <div className="detail-item">
          <div className="detail-label">{t('common.description')}</div>
          <div className="detail-value">{b.description || '—'}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">{t('accountHolderDetail.dueDate')}</div>
          <div className="detail-value">{b.dueDate ? fmtDate(b.dueDate) : t('billDetail.noDueDate')}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">{t('bills.created')}</div>
          <div className="detail-value">{fmtDate(b.createdAt)}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header"><h3>{t('accountHolderDetail.payments')} ({data.payments?.length || 0})</h3></div>
        {data.payments?.length > 0 ? (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('payments.method')}</th>
                    <th>{t('payments.reference')}</th>
                    <th>{t('common.description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map(p => (
                    <tr key={p._id}>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td>{p.paymentMethod === 'cash' ? t('payments.cash') : (p.paymentMethod === 'bank_transfer' ? t('payments.bankTransfer') : (p.paymentMethod === 'cheque' ? t('payments.cheque') : (p.paymentMethod === 'mobile_banking' ? t('payments.mobile') : t('payments.other'))))}</td>
                      <td>{p.referenceNumber || '—'}</td>
                      <td>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="card empty-state"><p>{t('accountHolderDetail.noPaymentsYet')}</p></div>}
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayment(false); }}>
          <div className="modal">
            <h3>{data.bill.type === 'receivable' ? t('billDetail.collectMoney') : t('billDetail.recordPayment')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', marginTop: '-16px' }}>{t('accountHolderDetail.outstanding')}: {fmt(data.remaining)}</p>
            <form onSubmit={handlePayment}>
              <div className="form-row">
                <div className="form-group"><label>{t('common.amount')} *</label><input className="form-control" type="number" step="0.01" min="0" max={data.remaining} value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required /></div>
                <div className="form-group"><label>{t('common.date')} *</label><input className="form-control" type="date" value={payForm.paymentDate} onChange={e => setPayForm({...payForm, paymentDate: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('payments.method')}</label>
                  <select className="form-control" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                    <option value="cash">{t('payments.cash')}</option>
                    <option value="bank_transfer">{t('payments.bankTransfer')}</option>
                    <option value="cheque">{t('payments.cheque')}</option>
                    <option value="mobile_banking">{t('payments.mobile')}</option>
                    <option value="other">{t('payments.other')}</option>
                  </select>
                </div>
                <div className="form-group"><label>{t('payments.reference')}</label><input className="form-control" value={payForm.referenceNumber} onChange={e => setPayForm({...payForm, referenceNumber: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>{t('accountHolders.notes')}</label><textarea className="form-control" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : (data.bill.type === 'receivable' ? t('billDetail.collectPayment') : t('accountHolderDetail.recordPayment'))}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
