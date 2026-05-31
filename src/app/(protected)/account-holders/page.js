'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';

export default function AccountHolders() {
  const router = useRouter();
  const { data: holders, isLoading, refetch } = useCachedQuery('/api/account-holders');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'client', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t, fmt } = useLanguage();

  const filtered = useMemo(() => {
    const list = holders || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q)
    );
  }, [holders, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/account-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setSaving(false);
        return;
      }
      setShowModal(false);
      setForm({ name: '', type: 'client', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
      refetch();
    } catch {
      setError(t('accountHolders.failedDelete'));
    }
    setSaving(false);
  };

  const getHolderTypeLabel = (type) => {
    if (type === 'vendor') return t('accountHolders.vendor');
    if (type === 'client') return t('accountHolders.client');
    if (type === 'both') return t('accountHolders.both');
    return type;
  };

  const getOutstanding = (h) => {
    if (h.type === 'client') return { amount: h.outstandingReceivable, label: t('dashboard.theyOweYou') };
    if (h.type === 'vendor') return { amount: h.outstandingPayable, label: t('dashboard.youOweThem') };
    const net = (h.outstandingReceivable || 0) - (h.outstandingPayable || 0);
    if (net > 0) return { amount: net, label: t('dashboard.theyOweYou') };
    if (net < 0) return { amount: Math.abs(net), label: t('dashboard.youOweThem') };
    return { amount: 0, label: t('dashboard.settled') };
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('accountHolders.title')}</h2>
          <p>{t('accountHolders.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('accountHolders.newHolder')}</button>
      </div>

      <div className="filters-bar">
        <input
          className="form-control"
          placeholder={`🔍 ${t('dashboard.searchPeople')}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="action-list">
          {filtered.map((h) => {
            const { amount, label } = getOutstanding(h);
            return (
              <div key={h._id} className="action-row" onClick={() => router.push(`/account-holders/${h._id}`)}>
                <div>
                  <div className="action-row-name">{h.name}</div>
                  <div className="action-row-sub">
                    {getHolderTypeLabel(h.type)}
                    {h.phone ? ` · ${h.phone}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`action-row-amount ${amount > 0 ? 'negative' : 'positive'}`}>
                    {amount > 0 ? fmt(amount) : t('dashboard.settled')}
                  </div>
                  {amount > 0 && <div className="action-row-sub">{label}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">👥</div>
          <h3>{search ? t('users.noUsersFound') : t('accountHolders.noHolders')}</h3>
          <p>{search ? t('users.noUsersFoundDesc') : t('accountHolders.noHoldersSub')}</p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('accountHolders.newHolder')}</button>
          )}
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
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.phone')}</label>
                  <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('common.type')}</label>
                  <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="client">{t('accountHolders.client')}</option>
                    <option value="vendor">{t('accountHolders.vendor')}</option>
                    <option value="both">{t('accountHolders.both')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.bankName')}</label>
                  <input className="form-control" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>{t('accountHolders.notes')}</label>
                <textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
