'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { syncAfterBillCreate, refreshCachesAfterMutation } from '@/lib/fetchCache';
import { apiFetch } from '@/lib/api';

function NewBillForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedHolder = searchParams.get('holder') || '';
  const preselectedCategory = searchParams.get('category') === 'loan' ? 'loan' : 'bill';

  const [holders, setHolders] = useState([]);
  const [form, setForm] = useState({
    accountHolderId: preselectedHolder,
    category: preselectedCategory,
    type: 'receivable',
    description: '',
    totalAmount: '',
    dueDate: '',
    installmentAmount: '',
    installmentFrequency: 'monthly',
    interestRate: '0',
    nextDueDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const selectedHolder = holders.find((h) => h._id === form.accountHolderId);
  const isLoan = form.category === 'loan';

  useEffect(() => {
    if (selectedHolder) {
      if (selectedHolder.type === 'client') setForm((f) => ({ ...f, type: 'receivable' }));
      else if (selectedHolder.type === 'vendor') setForm((f) => ({ ...f, type: 'payable' }));
    }
  }, [selectedHolder]);

  useEffect(() => {
    apiFetch('/api/account-holders').then((r) => r.json()).then(setHolders);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        accountHolderId: form.accountHolderId,
        category: form.category,
        type: form.type,
        description: form.description || (isLoan ? 'Loan' : ''),
        totalAmount: parseFloat(form.totalAmount),
        dueDate: form.dueDate || form.nextDueDate || null,
        nextDueDate: form.nextDueDate || form.dueDate || null,
        installmentAmount: isLoan && form.installmentAmount ? parseFloat(form.installmentAmount) : null,
        installmentFrequency: isLoan ? form.installmentFrequency : 'flexible',
        interestRate: isLoan ? parseFloat(form.interestRate || '0') : 0,
      };
      const res = await apiFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setSaving(false);
        return;
      }
      syncAfterBillCreate(data, data.accountHolderId);
      await refreshCachesAfterMutation(data.accountHolderId);
      router.push(`/bills/${data._id}`);
    } catch {
      setError(t('accountHolders.failedDelete'));
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/bills" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('billDetail.backLink')}</Link>
          <h2 style={{ marginTop: '8px' }}>{isLoan ? t('loan.createLoan') : t('newBill.title')}</h2>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('newBill.recordType')}</label>
            <select className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="bill">{t('loan.regularBill')}</option>
              <option value="loan">{t('loan.loanRecord')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('newBill.accountHolder')} *</label>
            <select className="form-control" value={form.accountHolderId} onChange={(e) => setForm({ ...form, accountHolderId: e.target.value })} required>
              <option value="">{t('newBill.selectHolder')}</option>
              {holders.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>

          {selectedHolder && selectedHolder.type === 'both' && (
            <div className="form-group">
              <label>{t('accountHolderDetail.billType')} *</label>
              <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                <option value="receivable">{t('accountHolderDetail.billTypeDescR')}</option>
                <option value="payable">{t('accountHolderDetail.billTypeDescP')}</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>{t('common.description')}</label>
            <input
              className="form-control"
              placeholder={isLoan ? t('loan.loanDescPlaceholder') : t('accountHolderDetail.billDescPlaceholder')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{isLoan ? t('loan.loanAmount') : t('common.amount')} *</label>
              <input className="form-control" type="number" step="0.01" min="0" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{isLoan ? t('loan.firstDueDate') : t('accountHolderDetail.dueDate')}</label>
              <input
                className="form-control"
                type="date"
                value={isLoan ? form.nextDueDate : form.dueDate}
                onChange={(e) => setForm(isLoan ? { ...form, nextDueDate: e.target.value, dueDate: e.target.value } : { ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          {isLoan && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('loan.installmentAmount')}</label>
                  <input className="form-control" type="number" step="0.01" min="0" value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>{t('loan.installmentFrequency')}</label>
                  <select className="form-control" value={form.installmentFrequency} onChange={(e) => setForm({ ...form, installmentFrequency: e.target.value })}>
                    <option value="weekly">{t('loan.weekly')}</option>
                    <option value="monthly">{t('loan.monthly')}</option>
                    <option value="flexible">{t('loan.flexible')}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{t('loan.interestRate')}</label>
                <input className="form-control" type="number" step="0.01" min="0" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link href="/bills" className="btn btn-secondary">{t('common.cancel')}</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('common.saving') : isLoan ? t('loan.createLoan') : t('newBill.createBtn')}
            </button>
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
