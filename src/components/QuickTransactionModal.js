'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { syncAfterPaymentMutation } from '@/lib/fetchCache';
import { suggestPaymentAmount } from '@/lib/loanUtils';
import { useLanguage } from '@/components/LanguageContext';

export default function QuickTransactionModal({ open, onClose }) {
  const { t, fmt, fmtDate } = useLanguage();
  const [mode, setMode] = useState('collect');
  const [holders, setHolders] = useState([]);
  const [bills, setBills] = useState([]);
  const [holderId, setHolderId] = useState('');
  const [billId, setBillId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [loadingBills, setLoadingBills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/account-holders').then((r) => r.json()).then(setHolders);
    setMode('collect');
    setHolderId('');
    setBillId('');
    setAmount('');
    setNote('');
    setSearch('');
    setError('');
    setBills([]);
  }, [open]);

  const filteredHolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return holders;
    return holders.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q)
    );
  }, [holders, search]);

  useEffect(() => {
    if (!holderId) {
      setBills([]);
      setBillId('');
      return;
    }

    setLoadingBills(true);
    apiFetch(`/api/bills?accountHolderId=${holderId}`)
      .then((r) => r.json())
      .then((all) => {
        const targetType = mode === 'collect' ? 'receivable' : 'payable';
        const openBills = all.filter((b) => b.type === targetType && b.status !== 'paid');
        setBills(openBills);
        if (openBills.length === 1) {
          setBillId(openBills[0]._id);
          setAmount(String(suggestPaymentAmount(openBills[0], openBills[0].totalAmount)));
        } else {
          setBillId('');
          setAmount('');
        }
      })
      .finally(() => setLoadingBills(false));
  }, [holderId, mode]);

  useEffect(() => {
    const bill = bills.find((b) => b._id === billId);
    if (!bill) return;
    apiFetch(`/api/bills/${billId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.remaining != null) {
          setAmount(String(suggestPaymentAmount(data.bill, data.remaining)));
        }
      });
  }, [billId, bills]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!holderId || !billId || !amount) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          accountHolderId: holderId,
          amount: parseFloat(amount),
          paymentMethod: 'cash',
          note,
          paymentDate: new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        setSaving(false);
        return;
      }
      await syncAfterPaymentMutation();
      onClose(true);
    } catch {
      setError(t('accountHolders.failedDelete'));
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}>
      <div className="modal" style={{ maxWidth: '480px' }}>
        <h3>{t('quickTx.title')}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-12px', marginBottom: '20px' }}>
          {t('quickTx.subtitle')}
        </p>

        <div className="quick-mode-toggle">
          <button
            type="button"
            className={mode === 'collect' ? 'active collect' : ''}
            onClick={() => { setMode('collect'); setBillId(''); setAmount(''); }}
          >
            💰 {t('dashboard.collect')}
          </button>
          <button
            type="button"
            className={mode === 'pay' ? 'active pay' : ''}
            onClick={() => { setMode('pay'); setBillId(''); setAmount(''); }}
          >
            💸 {t('dashboard.pay')}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('quickTx.findPerson')}</label>
            <input
              className="form-control"
              placeholder={`🔍 ${t('dashboard.searchPeople')}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('newBill.accountHolder')} *</label>
            <select
              className="form-control"
              value={holderId}
              onChange={(e) => setHolderId(e.target.value)}
              required
            >
              <option value="">{t('newBill.selectHolder')}</option>
              {filteredHolders.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}{h.phone ? ` (${h.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {holderId && (
            <div className="form-group">
              <label>{mode === 'collect' ? t('quickTx.selectToCollect') : t('quickTx.selectToPay')} *</label>
              {loadingBills ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('common.loading')}</p>
              ) : bills.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('quickTx.noOpenBills')}</p>
              ) : (
                <select className="form-control" value={billId} onChange={(e) => setBillId(e.target.value)} required>
                  <option value="">{t('accountHolderDetail.chooseBill')}</option>
                  {bills.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.billNumber}{b.category === 'loan' ? ` (${t('loan.badge')})` : ''} — {fmt(b.totalAmount)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label>{t('common.amount')} *</label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={!billId}
            />
          </div>

          <div className="form-group">
            <label>{t('common.note')}</label>
            <input
              className="form-control"
              placeholder={t('quickTx.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !billId}
              style={mode === 'collect' ? { background: 'linear-gradient(135deg, var(--success), #059669)' } : undefined}
            >
              {saving ? t('common.saving') : mode === 'collect' ? t('dashboard.collect') : t('dashboard.pay')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuickTransactionFab() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="quick-fab"
        onClick={() => setOpen(true)}
        aria-label={t('quickTx.title')}
      >
        ⚡
      </button>
      <QuickTransactionModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
