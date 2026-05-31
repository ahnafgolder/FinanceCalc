'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cachedFetch, invalidateCache } from '@/lib/fetchCache';
import { apiFetch } from '@/lib/api';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

export default function AccountHolders() {
  const router = useRouter();
  const { data: holders, isLoading, refetch } = useCachedQuery('/api/account-holders');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'vendor', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t, fmt } = useLanguage();

  const refresh = () => {
    invalidateCache('/api/dashboard');
    refetch();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/account-holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setShowModal(false);
      setForm({ name: '', type: 'vendor', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
      invalidateCache('/api/account-holders');
      refresh();
    } catch { setError(t('accountHolders.failedDelete')); }
    setSaving(false);
  };

  const getHolderTypeLabel = (type) => {
    if (type === 'vendor') return t('accountHolders.vendor');
    if (type === 'client') return t('accountHolders.client');
    if (type === 'both') return t('accountHolders.both');
    return type;
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const list = holders || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('accountHolders.title')}</h2>
          <p>{t('accountHolders.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('accountHolders.newHolder')}</button>
      </div>

      {list.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('accountHolders.name')}</th>
                  <th>{t('common.type')}</th>
                  <th className="hide-mobile">{t('accountHolders.bank')}</th>
                  <th className="hide-mobile">{t('accountHolders.totalBilled')}</th>
                  <th className="hide-mobile">{t('accountHolders.collected')}</th>
                  <th className="hide-mobile">{t('accountHolders.paidOut')}</th>
                  <th>{t('accountHolders.outstanding')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map(h => (
                  <tr key={h._id} onClick={() => router.push(`/account-holders/${h._id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{h.name}</td>
                    <td><span className={`badge badge-${h.type}`}>{getHolderTypeLabel(h.type)}</span></td>
                    <td className="hide-mobile">{h.bankName || '—'}</td>
                    <td className="hide-mobile">{fmt(h.totalBilled)}</td>
                    <td className="hide-mobile" style={{ color: 'var(--success)' }}>{fmt(h.totalCollected)}</td>
                    <td className="hide-mobile" style={{ color: 'var(--danger)' }}>{fmt(h.totalPaidOut)}</td>
                    <td style={{ color: (h.outstandingReceivable > 0 || h.outstandingPayable > 0) ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {h.type === 'client' ? fmt(h.outstandingReceivable) : (h.type === 'vendor' ? fmt(h.outstandingPayable) : fmt(h.outstandingReceivable + h.outstandingPayable))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">👥</div>
          <h3>{t('accountHolders.noHolders')}</h3>
          <p>{t('accountHolders.noHoldersSub')}</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('accountHolders.newHolder')}</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <h3>{t('accountHolders.newHolderTitle')}</h3>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('accountHolders.name')} *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>{t('common.type')}</label>
                  <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="vendor">{t('accountHolders.vendor')}</option>
                    <option value="client">{t('accountHolders.client')}</option>
                    <option value="both">{t('accountHolders.both')}</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('accountHolders.bankName')}</label>
                  <input className="form-control" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.accountName')}</label>
                  <input className="form-control" value={form.bankAccountName} onChange={e => setForm({...form, bankAccountName: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('accountHolders.accountNumber')}</label>
                  <input className="form-control" value={form.bankAccountNumber} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.phone')}</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('accountHolders.email')}</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.address')}</label>
                  <input className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>{t('accountHolders.notes')}</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
