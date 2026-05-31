'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { afterDataMutation, clearAllCache } from '@/lib/fetchCache';
import { apiFetch } from '@/lib/api';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { buildWhatsAppStatement, getPrimaryOutstanding, openWhatsAppShare } from '@/lib/ledger';
import HolderDetailOverview from '@/components/account-holders/HolderDetailOverview';
import LedgerTimeline from '@/components/account-holders/LedgerTimeline';
import { dueLabel } from '@/lib/dueLabel';

export default function AccountHolderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = `/api/account-holders/${id}`;
  const [activeTab, setActiveTab] = useState('overview');
  const { data, isLoading, refetch } = useCachedQuery(apiUrl, [id]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const { t, fmt, fmtDate, lang } = useLanguage();

  // Bill modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ category: 'bill', type: 'receivable', description: '', totalAmount: '', dueDate: '', installmentAmount: '', installmentFrequency: 'monthly', interestRate: '0', nextDueDate: '' });
  const [billSaving, setBillSaving] = useState(false);
  const [billError, setBillError] = useState('');

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payBillId, setPayBillId] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportMode, setReportMode] = useState(null);

  const unpaidBills = useMemo(
    () => data?.bills?.filter((b) => b.status !== 'paid') || [],
    [data?.bills]
  );

  const getBillRemaining = useCallback(
    (bill) => {
      if (!bill) return 0;
      if (bill.remaining != null) return bill.remaining;
      const paid = (data?.payments || [])
        .filter((p) => String(p.billId?._id || p.billId) === String(bill._id))
        .reduce((s, p) => s + p.amount, 0);
      return Math.max(0, bill.totalAmount - paid);
    },
    [data?.payments]
  );

  const applySelectedStatementToPayForm = useCallback(
    (bill) => {
      if (!bill) {
        setPayForm((prev) => ({ ...prev, amount: '', note: '' }));
        return;
      }
      const remaining = getBillRemaining(bill);
      setPayForm((prev) => ({
        ...prev,
        amount: remaining > 0 ? String(remaining) : String(bill.totalAmount || ''),
        note: (bill.description || '').trim(),
      }));
    },
    [getBillRemaining]
  );

  const openPayModal = useCallback(
    (preselectedBillId) => {
      setPayError('');
      const billId = preselectedBillId || '';
      setPayBillId(billId);
      setPayForm({
        amount: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        note: '',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      const bill = billId ? unpaidBills.find((b) => b._id === billId) : null;
      if (bill) applySelectedStatementToPayForm(bill);
      setShowPayModal(true);
    },
    [unpaidBills, applySelectedStatementToPayForm]
  );

  useEffect(() => {
    if (data?.holder) setForm(data.holder);
  }, [data]);

  useEffect(() => {
    if (!data?.holder) return;
    const action = searchParams.get('action');
    if (action === 'statement') setShowBillModal(true);
    else if (action === 'pay' || action === 'collect') openPayModal();
  }, [searchParams, data?.holder, openPayModal]);

  const refresh = async () => {
    await afterDataMutation({ accountHolderId: id });
    refetch();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await apiFetch(`/api/account-holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setEditing(false);
    await afterDataMutation({ accountHolderId: id });
    refetch();
  };

  const handleDelete = async () => {
    if (!confirm(t('accountHolders.deleteConfirm'))) return;
    await apiFetch(`/api/account-holders/${id}`, { method: 'DELETE' });
    clearAllCache();
    router.push('/account-holders');
  };


  // ── Add Bill ──
  const handleAddBill = async (e) => {
    e.preventDefault();
    setBillSaving(true);
    setBillError('');
    try {
      const res = await apiFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: billForm.category,
          type: billForm.type,
          accountHolderId: id,
          description: billForm.description || (billForm.category === 'loan' ? 'Loan' : ''),
          totalAmount: parseFloat(billForm.totalAmount),
          dueDate: billForm.dueDate || billForm.nextDueDate || null,
          nextDueDate: billForm.nextDueDate || billForm.dueDate || null,
          installmentAmount: billForm.category === 'loan' && billForm.installmentAmount ? parseFloat(billForm.installmentAmount) : null,
          installmentFrequency: billForm.category === 'loan' ? billForm.installmentFrequency : 'flexible',
          interestRate: billForm.category === 'loan' ? parseFloat(billForm.interestRate || '0') : 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setBillError(d.error); setBillSaving(false); return; }
      setShowBillModal(false);
      setBillForm({ category: 'bill', type: 'receivable', description: '', totalAmount: '', dueDate: '', installmentAmount: '', installmentFrequency: 'monthly', interestRate: '0', nextDueDate: '' });
      await afterDataMutation({ accountHolderId: id, createdBill: d });
      refetch();
    } catch { setBillError('Something went wrong'); }
    setBillSaving(false);
  };

  // ── Add Payment ──
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!payBillId) { setPayError('Please select a bill'); return; }
    setPaySaving(true);
    setPayError('');
    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount), billId: payBillId, accountHolderId: id }),
      });
      const d = await res.json();
      if (!res.ok) { setPayError(d.error); setPaySaving(false); return; }
      setShowPayModal(false);
      setPayForm({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
      setPayBillId('');
      await afterDataMutation({ accountHolderId: id });
      refetch();
    } catch { setPayError(t('accountHolders.failedDelete')); }
    setPaySaving(false);
  };

  // ── Delete Bill ──
  const handleDeleteBill = async (billId) => {
    if (!confirm(t('accountHolderDetail.deleteBillConfirm'))) return;
    const res = await apiFetch(`/api/bills/${billId}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    await afterDataMutation({ accountHolderId: id, deletedBillIds: [billId] });
    refetch();
  };

  // ── Delete Payment ──
  const handleDeletePayment = async (paymentId) => {
    if (!confirm(t('accountHolderDetail.deletePaymentConfirm'))) return;
    const res = await apiFetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    if (!res.ok) { alert('Failed to delete payment'); return; }
    await afterDataMutation({ accountHolderId: id, deletedPaymentIds: [paymentId] });
    refetch();
  };

  const handleReportStep = (mode) => {
    setReportMode(mode);
  };

  const openReport = (lang) => {
    if (reportMode === 'all') {
      window.open(`/reports/account-statement?holderId=${id}&lang=${lang}`, '_blank');
    } else {
      const [year, month] = reportMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      window.open(`/reports/account-statement?holderId=${id}&startDate=${startDate}&endDate=${endDate}&lang=${lang}`, '_blank');
    }
    setShowReportModal(false);
    setReportMode(null);
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data?.holder) return <div className="empty-state"><h3>{t('common.noData')}</h3></div>;

  const h = data.holder;
  const primary = getPrimaryOutstanding(data);
  const selectedPayBill = unpaidBills.find((b) => b._id === payBillId);

  const handlePayBillSelect = (billId) => {
    setPayBillId(billId);
    const bill = unpaidBills.find((b) => b._id === billId);
    applySelectedStatementToPayForm(bill);
  };

  const openCount = data.summary?.openCount ?? unpaidBills.length;
  let balanceSummaryText = '';
  if (primary.direction === 'owesMe') {
    balanceSummaryText = t('accountHolderDetail.balanceSummaryOwesMe')
      .replace('{name}', h.name)
      .replace('{amount}', fmt(primary.amount))
      .replace('{count}', String(openCount));
  } else if (primary.direction === 'iOwe') {
    balanceSummaryText = t('accountHolderDetail.balanceSummaryIOwe')
      .replace('{name}', h.name)
      .replace('{amount}', fmt(primary.amount))
      .replace('{count}', String(openCount));
  } else {
    balanceSummaryText = t('accountHolderDetail.balanceSummarySettled').replace('{name}', h.name);
  }

  const tabs = [
    { id: 'overview', label: t('accountHolderDetail.tabOverview') },
    { id: 'history', label: t('accountHolderDetail.tabHistory') },
    { id: 'statements', label: t('accountHolderDetail.tabStatements') },
    { id: 'payments', label: t('accountHolderDetail.tabPayments') },
  ];

  const handleCall = () => {
    if (h.phone) window.location.href = `tel:${h.phone.replace(/\s/g, '')}`;
  };

  const handleWhatsApp = () => {
    const url = buildWhatsAppStatement({
      holderName: h.name,
      phone: h.phone,
      outstandingReceivable: data.outstandingReceivable,
      outstandingPayable: data.outstandingPayable,
      holderType: h.type,
      totalCollected: data.totalCollected,
      totalPaidOut: data.totalPaidOut,
      fmt,
      fmtDate,
      lang,
    });
    openWhatsAppShare(url);
  };

  const getHolderTypeLabel = (type) => {
    if (type === 'vendor') return t('accountHolders.vendor');
    if (type === 'client') return t('accountHolders.client');
    if (type === 'both') return t('accountHolders.both');
    return type;
  };

  return (
    <div className="holder-detail-with-sticky">
      <div className="detail-header">
        <div>
          <Link href="/account-holders" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('accountHolderDetail.backLink')}</Link>
          <h2 style={{ marginTop: '8px' }}>{h.name}</h2>
          <span className={`badge badge-${h.type}`}>{getHolderTypeLabel(h.type)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {h.phone && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCall}>📞 {t('dashboard.call')}</button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleWhatsApp} style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none' }}>
            💬 {t('dashboard.shareWhatsApp')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>{editing ? t('common.cancel') : `✏️ ${t('common.edit')}`}</button>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '24px' }}>
          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <div className="form-group"><label>{t('accountHolders.name')}</label><input className="form-control" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>{t('common.type')}</label><select className="form-control" value={form.type || 'vendor'} onChange={e => setForm({...form, type: e.target.value})}><option value="vendor">{t('accountHolders.vendor')}</option><option value="client">{t('accountHolders.client')}</option><option value="both">{t('accountHolders.both')}</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('accountHolders.bankName')}</label><input className="form-control" value={form.bankName || ''} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
              <div className="form-group"><label>{t('accountHolders.accountName')}</label><input className="form-control" value={form.bankAccountName || ''} onChange={e => setForm({...form, bankAccountName: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('accountHolders.accountNumber')}</label><input className="form-control" value={form.bankAccountNumber || ''} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} /></div>
              <div className="form-group"><label>{t('accountHolders.phone')}</label><input className="form-control" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t('accountHolders.email')}</label><input className="form-control" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>{t('accountHolders.address')}</label><input className="form-control" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>{t('accountHolders.notes')}</label><textarea className="form-control" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </form>
        </div>
      ) : (
        <>
          <nav className="holder-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`holder-tab ${activeTab === tab.id ? 'holder-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <HolderDetailOverview
              data={data}
              balanceSummaryText={balanceSummaryText}
              onAddStatement={() => setShowBillModal(true)}
              onOpenPay={openPayModal}
              onShowReport={() => setShowReportModal(true)}
            />
          )}

          {activeTab === 'history' && (
            <div className="section">
              <LedgerTimeline ledger={data.ledger} />
            </div>
          )}

          {activeTab === 'statements' && (
            <div className="section">
              <div className="section-header">
                <h3>{t('accountHolderDetail.bills')} ({data.bills?.length || 0})</h3>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowBillModal(true)}>+ {t('accountHolderDetail.addBill')}</button>
              </div>
              {data.bills?.length > 0 ? (
                <div className="card"><div className="table-container"><table>
                  <thead>
                    <tr>
                      <th>{t('bills.billNumber')}</th>
                      <th>{t('common.type')}</th>
                      <th className="hide-mobile">{t('common.description')}</th>
                      <th>{t('common.amount')}</th>
                      <th>{t('accountHolderDetail.remaining')}</th>
                      <th className="hide-mobile">{t('accountHolderDetail.dueDate')}</th>
                      <th>{t('common.status')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{data.bills.map((b) => {
                    const remaining = b.remaining ?? getBillRemaining(b);
                    const pct = b.totalAmount > 0 ? Math.min(((b.totalPaid || 0) / b.totalAmount) * 100, 100) : 0;
                    return (
                      <tr key={b._id}>
                        <td style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => router.push(`/bills/${b._id}`)}>{b.billNumber}</td>
                        <td>
                          {b.category === 'loan' && <span className="badge badge-loan" style={{ marginRight: '6px' }}>{t('loan.badge')}</span>}
                          <span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`}>{b.type === 'receivable' ? t('accountHolderDetail.billTypeR') : t('accountHolderDetail.billTypeP')}</span>
                        </td>
                        <td className="hide-mobile">{b.description || '—'}</td>
                        <td>{fmt(b.totalAmount)}</td>
                        <td>
                          {fmt(remaining)}
                          <div className="progress-bar" style={{ marginTop: '6px', maxWidth: '100px' }}>
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="hide-mobile">{b.dueDate ? dueLabel(b.dueDate, t, fmtDate) : '—'}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status === 'paid' ? t('accountHolderDetail.statusPaid') : (b.status === 'unpaid' ? t('accountHolderDetail.statusUnpaid') : t('accountHolderDetail.statusPartial'))}</span></td>
                        <td><button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteBill(b._id)}>×</button></td>
                      </tr>
                    );
                  })}</tbody>
                </table></div></div>
              ) : (
                <div className="card empty-state"><p>{t('accountHolderDetail.noBillsYet')}</p></div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="section">
              <div className="section-header">
                <h3>{t('accountHolderDetail.payments')} ({data.payments?.length || 0})</h3>
                {unpaidBills.length > 0 && (
                  <button type="button" className="btn btn-sm" onClick={() => openPayModal()} style={{ background: 'linear-gradient(135deg, var(--success), #059669)', color: '#fff', border: 'none' }}>
                    + {t('accountHolderDetail.addPayment')}
                  </button>
                )}
              </div>
              {data.payments?.length > 0 ? (
                <div className="card"><div className="table-container"><table>
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('common.type')}</th>
                      <th>{t('bills.billNumber')}</th>
                      <th>{t('common.amount')}</th>
                      <th className="hide-mobile">{t('payments.method')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>{data.payments.map((p) => (
                    <tr key={p._id}>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td><span className={`badge badge-${p.type === 'received' ? 'success' : 'danger'}`}>{p.type === 'received' ? t('accountHolderDetail.payTypeR') : t('accountHolderDetail.payTypeP')}</span></td>
                      <td>{p.billId?.billNumber || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td className="hide-mobile">{p.paymentMethod === 'cash' ? t('payments.cash') : t('payments.other')}</td>
                      <td><button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeletePayment(p._id)}>×</button></td>
                    </tr>
                  ))}</tbody>
                </table></div></div>
              ) : (
                <div className="card empty-state"><p>{t('accountHolderDetail.noPaymentsYet')}</p></div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ {t('common.delete')}</button>
          </div>
        </>
      )}

      {!editing && (
        <div className="sticky-holder-actions">
          {primary.direction !== 'settled' && unpaidBills.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openPayModal()}
              style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}
            >
              {primary.direction === 'owesMe' ? t('dashboard.collect') : t('dashboard.pay')}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(true)}>
            + {t('dashboard.charge')}
          </button>
          {unpaidBills.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => openPayModal()}>
              {t('accountHolderDetail.addPayment')}
            </button>
          )}
        </div>
      )}

      {/* ── Add Bill Modal ── */}
      {showBillModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBillModal(false); }}>
          <div className="modal">
            <h3>{t('accountHolderDetail.addBillFor')} {h.name}</h3>
            {billError && <div className="auth-error">{billError}</div>}
            <form onSubmit={handleAddBill}>
              <div className="form-group">
                <label>{t('loan.recordType')}</label>
                <select className="form-control" value={billForm.category} onChange={e => setBillForm({ ...billForm, category: e.target.value })}>
                  <option value="bill">{t('loan.regularBill')}</option>
                  <option value="loan">{t('loan.loanRecord')}</option>
                </select>
              </div>
              {h.type === 'both' ? (
                <div className="form-group">
                  <label>{t('accountHolderDetail.billType')} *</label>
                  <select className="form-control" value={billForm.type} onChange={e => setBillForm({...billForm, type: e.target.value})} required>
                    <option value="receivable">{t('accountHolderDetail.billTypeDescR')}</option>
                    <option value="payable">{t('accountHolderDetail.billTypeDescP')}</option>
                  </select>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {billForm.type === 'receivable' ? t('accountHolderDetail.billTypeRHint') : t('accountHolderDetail.billTypePHint')}
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label>{t('accountHolderDetail.billType')}</label>
                  <input className="form-control" value={h.type === 'client' ? t('accountHolderDetail.billTypeDescR') : t('accountHolderDetail.billTypeDescP')} disabled />
                </div>
              )}
              <div className="form-group"><label>{t('common.description')}</label><input className="form-control" placeholder={billForm.category === 'loan' ? t('loan.loanDescPlaceholder') : t('accountHolderDetail.billDescPlaceholder')} value={billForm.description} onChange={e => setBillForm({...billForm, description: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label>{billForm.category === 'loan' ? t('loan.loanAmount') : t('common.amount')} *</label><input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={billForm.totalAmount} onChange={e => setBillForm({...billForm, totalAmount: e.target.value})} required /></div>
                <div className="form-group"><label>{billForm.category === 'loan' ? t('loan.firstDueDate') : t('accountHolderDetail.dueDate')}</label><input className="form-control" type="date" value={billForm.category === 'loan' ? billForm.nextDueDate : billForm.dueDate} onChange={e => billForm.category === 'loan' ? setBillForm({...billForm, nextDueDate: e.target.value, dueDate: e.target.value}) : setBillForm({...billForm, dueDate: e.target.value})} /></div>
              </div>
              {billForm.category === 'loan' && (
                <div className="form-row">
                  <div className="form-group"><label>{t('loan.installmentAmount')}</label><input className="form-control" type="number" step="0.01" min="0" value={billForm.installmentAmount} onChange={e => setBillForm({...billForm, installmentAmount: e.target.value})} /></div>
                  <div className="form-group"><label>{t('loan.installmentFrequency')}</label><select className="form-control" value={billForm.installmentFrequency} onChange={e => setBillForm({...billForm, installmentFrequency: e.target.value})}><option value="weekly">{t('loan.weekly')}</option><option value="monthly">{t('loan.monthly')}</option><option value="flexible">{t('loan.flexible')}</option></select></div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={billSaving}>{billSaving ? t('common.saving') : (billForm.category === 'loan' ? t('loan.createLoan') : t('accountHolderDetail.addBill'))}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayModal(false); }}>
          <div className="modal">
            <h3>{t('accountHolderDetail.recordPaymentFor')} {h.name}</h3>
            {payError && <div className="auth-error">{payError}</div>}
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label>{t('accountHolderDetail.selectBill')} *</label>
                <select className="form-control" value={payBillId} onChange={(e) => handlePayBillSelect(e.target.value)} required>
                  <option value="">{t('accountHolderDetail.chooseBill')}</option>
                  {unpaidBills.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.billNumber}
                      {b.description ? ` — ${b.description}` : ''}
                      {' — '}{fmt(b.totalAmount)}
                      {' '}({b.status === 'paid' ? t('accountHolderDetail.statusPaid') : (b.status === 'unpaid' ? t('accountHolderDetail.statusUnpaid') : t('accountHolderDetail.statusPartial'))})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>{t('common.amount')} *</label><input className="form-control" type="number" step="0.01" min="0" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required /></div>
                <div className="form-group"><label>{t('common.date')} *</label><input className="form-control" type="date" value={payForm.paymentDate} onChange={e => setPayForm({...payForm, paymentDate: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>{t('payments.method')}</label><select className="form-control" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                  <option value="cash">{t('payments.cash')}</option>
                  <option value="bank_transfer">{t('payments.bankTransfer')}</option>
                  <option value="cheque">{t('payments.cheque')}</option>
                  <option value="mobile_banking">{t('payments.mobile')}</option>
                  <option value="other">{t('payments.other')}</option>
                </select></div>
                <div className="form-group"><label>{t('payments.reference')}</label><input className="form-control" placeholder={t('accountHolderDetail.payRefPlaceholder')} value={payForm.referenceNumber} onChange={e => setPayForm({...payForm, referenceNumber: e.target.value})} /></div>
              </div>
              <div className="form-group">
                <label>{t('accountHolderDetail.statementNote')}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={
                    payBillId
                      ? ((selectedPayBill?.description || '').trim() || t('accountHolderDetail.noStatementNote'))
                      : t('accountHolderDetail.chooseBill')
                  }
                  value={payForm.note}
                  onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={paySaving} style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}>{paySaving ? t('common.saving') : t('accountHolderDetail.recordPayment')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowReportModal(false); setReportMode(null); } }}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            {!reportMode ? (
              <>
                <h3>{t('accountHolderDetail.generateReportFor')} {h.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-16px', marginBottom: '24px' }}>{t('accountHolderDetail.chooseTimeRange')}</p>
                
                <div className="form-group">
                  <label>{t('accountHolderDetail.selectMonth')}</label>
                  <input type="month" className="form-control" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowReportModal(false); setReportMode(null); }}>{t('common.cancel')}</button>
                  <button className="btn btn-secondary" onClick={() => handleReportStep('all')}>📄 {t('accountHolderDetail.allTimeReport')}</button>
                  <button className="btn btn-primary" onClick={() => handleReportStep('month')}>📈 {t('accountHolderDetail.monthlyReport')}</button>
                </div>
              </>
            ) : (
              <>
                <h3>🌐 {t('accountHolderDetail.selectReportLang')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '-16px', marginBottom: '24px' }}>
                  {t('accountHolderDetail.chooseReportLangDesc')}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '14px 0', fontSize: '15px' }}
                    onClick={() => openReport('en')}
                  >
                    🇬🇧 {t('common.langEnglish')}
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '14px 0', fontSize: '15px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    onClick={() => openReport('bn')}
                  >
                    🇧🇩 {t('common.langBangla')}
                  </button>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                  onClick={() => setReportMode(null)}
                >
                  ← {t('common.back')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
