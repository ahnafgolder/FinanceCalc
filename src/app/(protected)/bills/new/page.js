'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';

function NewBillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedHolder = searchParams.get('holder') || '';

  const [holders, setHolders] = useState([]);
  const [form, setForm] = useState({ accountHolderId: preselectedHolder, type: 'receivable', description: '', totalAmount: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const selectedHolder = holders.find(h => h._id === form.accountHolderId);

  useEffect(() => {
    if (selectedHolder) {
      if (selectedHolder.type === 'client') setForm(f => ({ ...f, type: 'receivable' }));
      else if (selectedHolder.type === 'vendor') setForm(f => ({ ...f, type: 'payable' }));
    }
  }, [selectedHolder]);

  useEffect(() => { fetch('/api/account-holders').then(r => r.json()).then(setHolders); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalAmount: parseFloat(form.totalAmount), dueDate: form.dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      router.push(`/bills/${data._id}`);
    } catch { setError(t('accountHolders.failedDelete')); setSaving(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/bills" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('billDetail.backLink')}</Link>
          <h2 style={{ marginTop: '8px' }}>{t('newBill.title')}</h2>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('newBill.accountHolder')} *</label>
            <select className="form-control" value={form.accountHolderId} onChange={e => setForm({...form, accountHolderId: e.target.value})} required>
              <option value="">{t('newBill.selectHolder')}</option>
              {holders.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          {selectedHolder && (
            <div className="form-group">
              <label>{t('accountHolderDetail.billType')} *</label>
              {selectedHolder.type === 'both' ? (
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})} required>
                  <option value="receivable">{t('accountHolderDetail.billTypeDescR')}</option>
                  <option value="payable">{t('accountHolderDetail.billTypeDescP')}</option>
                </select>
              ) : (
                <input className="form-control" value={form.type === 'receivable' ? t('accountHolderDetail.billTypeDescR') : t('accountHolderDetail.billTypeDescP')} disabled />
              )}
            </div>
          )}
          <div className="form-group">
            <label>{t('common.description')}</label>
            <input className="form-control" placeholder={t('accountHolderDetail.billDescPlaceholder')} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('common.amount')} *</label>
              <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>{t('accountHolderDetail.dueDate')}</label>
              <input className="form-control" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link href="/bills" className="btn btn-secondary">{t('common.cancel')}</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.saving') : t('newBill.createBtn')}</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function NewBill() {
  return (
    <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
      <NewBillForm />
    </Suspense>
  );
}
