'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountHolderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  // Bill modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ type: 'receivable', description: '', totalAmount: '', dueDate: '' });
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

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/account-holders/${id}`).then(r => r.json()).then(d => { setData(d); setForm(d.holder || {}); setLoading(false); });
  };
  useEffect(() => { fetchData(); }, [id]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleUpdate = async (e) => {
    e.preventDefault();
    await fetch(`/api/account-holders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setEditing(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this account holder and all associated bills/payments?')) return;
    await fetch(`/api/account-holders/${id}`, { method: 'DELETE' });
    router.push('/account-holders');
  };

  // ── Add Bill ──
  const handleAddBill = async (e) => {
    e.preventDefault();
    setBillSaving(true);
    setBillError('');
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: billForm.type, accountHolderId: id, description: billForm.description, totalAmount: parseFloat(billForm.totalAmount), dueDate: billForm.dueDate || null }),
      });
      const d = await res.json();
      if (!res.ok) { setBillError(d.error); setBillSaving(false); return; }
      setShowBillModal(false);
      setBillForm({ type: 'receivable', description: '', totalAmount: '', dueDate: '' });
      fetchData();
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
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount), billId: payBillId, accountHolderId: id }),
      });
      const d = await res.json();
      if (!res.ok) { setPayError(d.error); setPaySaving(false); return; }
      setShowPayModal(false);
      setPayForm({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
      setPayBillId('');
      fetchData();
    } catch { setPayError('Something went wrong'); }
    setPaySaving(false);
  };

  // ── Delete Bill ──
  const handleDeleteBill = async (billId) => {
    if (!confirm('Delete this bill? (Only allowed if no payments exist)')) return;
    const res = await fetch(`/api/bills/${billId}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    fetchData();
  };

  // ── Delete Payment ──
  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Delete this payment? The bill status will be recalculated.')) return;
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    if (!res.ok) { alert('Failed to delete payment'); return; }
    fetchData();
  };

  // ── Generate Report ──
  const openReport = (mode) => {
    if (mode === 'all') {
      window.open(`/reports/account-statement?holderId=${id}`, '_blank');
    } else {
      const [year, month] = reportMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      window.open(`/reports/account-statement?holderId=${id}&startDate=${startDate}&endDate=${endDate}`, '_blank');
    }
    setShowReportModal(false);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data?.holder) return <div className="empty-state"><h3>Not Found</h3></div>;

  const h = data.holder;
  const unpaidBills = data.bills?.filter(b => b.status !== 'paid') || [];

  return (
    <>
      <div className="detail-header">
        <div>
          <Link href="/account-holders" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>← Back to Account Holders</Link>
          <h2 style={{ marginTop: '8px' }}>{h.name}</h2>
          <span className={`badge badge-${h.type}`}>{h.type}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBillModal(true)}>📄 Add Bill</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPayModal(true)} style={{ background: 'linear-gradient(135deg, var(--success), #059669)', color: '#fff' }}>💰 Add Payment</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowReportModal(true)}>📈 Report</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : '✏️ Edit'}</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️</button>
        </div>
      </div>

      {editing ? (
        <div className="card" style={{ marginBottom: '24px' }}>
          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <div className="form-group"><label>Name</label><input className="form-control" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>Type</label><select className="form-control" value={form.type || 'vendor'} onChange={e => setForm({...form, type: e.target.value})}><option value="vendor">Vendor</option><option value="client">Client</option><option value="both">Both</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Bank Name</label><input className="form-control" value={form.bankName || ''} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
              <div className="form-group"><label>Account Name</label><input className="form-control" value={form.bankAccountName || ''} onChange={e => setForm({...form, bankAccountName: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Account Number</label><input className="form-control" value={form.bankAccountNumber || ''} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} /></div>
              <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input className="form-control" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>Address</label><input className="form-control" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea className="form-control" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {h.type === 'both' ? (
              <>
                <div className="stat-card success"><div className="stat-label">Total Collected</div><div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(data.totalCollected)}</div></div>
                <div className="stat-card danger"><div className="stat-label">Total Paid Out</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(data.totalPaidOut)}</div></div>
                <div className="stat-card info"><div className="stat-label">Outstanding (R)</div><div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(data.outstandingReceivable)}</div></div>
                <div className="stat-card accent"><div className="stat-label">Outstanding (P)</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(data.outstandingPayable)}</div></div>
              </>
            ) : (
              <>
                <div className="stat-card info"><div className="stat-label">{h.type === 'client' ? 'Total Billed (R)' : 'Total Billed (P)'}</div><div className="stat-value" style={{ color: 'var(--info)' }}>{h.type === 'client' ? fmt(data.totalReceivable) : fmt(data.totalPayable)}</div></div>
                <div className="stat-card success"><div className="stat-label">{h.type === 'client' ? 'Total Collected' : 'Total Paid Out'}</div><div className="stat-value" style={{ color: h.type === 'client' ? 'var(--success)' : 'var(--danger)' }}>{h.type === 'client' ? fmt(data.totalCollected) : fmt(data.totalPaidOut)}</div></div>
                <div className="stat-card danger"><div className="stat-label">Outstanding</div><div className="stat-value" style={{ color: (h.type === 'client' ? data.outstandingReceivable : data.outstandingPayable) > 0 ? 'var(--danger)' : 'var(--success)' }}>{h.type === 'client' ? fmt(data.outstandingReceivable) : fmt(data.outstandingPayable)}</div></div>
              </>
            )}
          </div>

          <div className="detail-grid" style={{ marginBottom: '32px' }}>
            {h.bankName && <div className="detail-item"><div className="detail-label">Bank</div><div className="detail-value">{h.bankName}</div></div>}
            {h.bankAccountName && <div className="detail-item"><div className="detail-label">Account Name</div><div className="detail-value">{h.bankAccountName}</div></div>}
            {h.bankAccountNumber && <div className="detail-item"><div className="detail-label">Account #</div><div className="detail-value">{h.bankAccountNumber}</div></div>}
            {h.phone && <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{h.phone}</div></div>}
            {h.email && <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{h.email}</div></div>}
            {h.address && <div className="detail-item"><div className="detail-label">Address</div><div className="detail-value">{h.address}</div></div>}
            {h.notes && <div className="detail-item"><div className="detail-label">Notes</div><div className="detail-value">{h.notes}</div></div>}
          </div>
        </>
      )}

      {/* ── Bills Section ── */}
      <div className="section">
        <div className="section-header">
          <h3>Bills ({data.bills?.length || 0})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBillModal(true)}>+ Add Bill</button>
        </div>
        {data.bills?.length > 0 ? (
          <div className="card"><div className="table-container"><table>
            <thead><tr><th>Bill #</th><th>Type</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.bills.map(b => (
              <tr key={b._id}>
                <td style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => router.push(`/bills/${b._id}`)}>{b.billNumber}</td>
                <td><span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`}>{b.type === 'receivable' ? 'Receivable' : 'Payable'}</span></td>
                <td>{b.description || '—'}</td>
                <td>{fmt(b.totalAmount)}</td>
                <td>{b.dueDate ? fmtDate(b.dueDate) : '—'}</td>
                <td>{fmtDate(b.createdAt)}</td>
                <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteBill(b._id)} title={b.status !== 'unpaid' ? 'Delete payments first' : 'Delete bill'}>×</button></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        ) : <div className="card empty-state"><p>No bills yet — click "Add Bill" to create one</p></div>}
      </div>

      {/* ── Payments Section ── */}
      <div className="section">
        <div className="section-header">
          <h3>Payments ({data.payments?.length || 0})</h3>
          {unpaidBills.length > 0 && <button className="btn btn-sm" onClick={() => setShowPayModal(true)} style={{ background: 'linear-gradient(135deg, var(--success), #059669)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Payment</button>}
        </div>
        {data.payments?.length > 0 ? (
          <div className="card"><div className="table-container"><table>
            <thead><tr><th>Date</th><th>Type</th><th>Bill</th><th>Amount</th><th>Method</th><th>Reference</th><th>Note</th><th></th></tr></thead>
            <tbody>{data.payments.map(p => (
              <tr key={p._id}>
                <td>{fmtDate(p.paymentDate)}</td>
                <td><span className={`badge badge-${p.type === 'received' ? 'success' : 'danger'}`}>{p.type === 'received' ? 'Received' : 'Paid'}</span></td>
                <td style={{ color: 'var(--accent)' }}>{p.billId?.billNumber || '—'}</td>
                <td style={{ color: p.type === 'received' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{fmt(p.amount)}</td>
                <td>{p.paymentMethod?.replace('_', ' ')}</td>
                <td>{p.referenceNumber || '—'}</td>
                <td>{p.note || '—'}</td>
                <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeletePayment(p._id)} title="Delete payment">×</button></td>
              </tr>
            ))}</tbody>
          </table></div></div>
        ) : <div className="card empty-state"><p>No payments yet</p></div>}
      </div>

      {/* ── Add Bill Modal ── */}
      {showBillModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBillModal(false); }}>
          <div className="modal">
            <h3>Add Bill for {h.name}</h3>
            {billError && <div className="auth-error">{billError}</div>}
            <form onSubmit={handleAddBill}>
              {h.type === 'both' ? (
                <div className="form-group">
                  <label>Bill Type *</label>
                  <select className="form-control" value={billForm.type} onChange={e => setBillForm({...billForm, type: e.target.value})} required>
                    <option value="receivable">Collecting Money (Receivable)</option>
                    <option value="payable">Giving Money (Payable)</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Bill Type</label>
                  <input className="form-control" value={h.type === 'client' ? 'Collecting Money (Receivable)' : 'Giving Money (Payable)'} disabled />
                </div>
              )}
              <div className="form-group"><label>Description</label><input className="form-control" placeholder="What is this bill for?" value={billForm.description} onChange={e => setBillForm({...billForm, description: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label>Amount *</label><input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={billForm.totalAmount} onChange={e => setBillForm({...billForm, totalAmount: e.target.value})} required /></div>
                <div className="form-group"><label>Due Date</label><input className="form-control" type="date" value={billForm.dueDate} onChange={e => setBillForm({...billForm, dueDate: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBillModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={billSaving}>{billSaving ? 'Creating...' : 'Create Bill'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayModal(false); }}>
          <div className="modal">
            <h3>Record Payment for {h.name}</h3>
            {payError && <div className="auth-error">{payError}</div>}
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label>Select Bill *</label>
                <select className="form-control" value={payBillId} onChange={e => setPayBillId(e.target.value)} required>
                  <option value="">Choose a bill...</option>
                  {unpaidBills.map(b => (
                    <option key={b._id} value={b._id}>{b.billNumber} — {fmt(b.totalAmount)} ({b.status})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Amount *</label><input className="form-control" type="number" step="0.01" min="0" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required /></div>
                <div className="form-group"><label>Date *</label><input className="form-control" type="date" value={payForm.paymentDate} onChange={e => setPayForm({...payForm, paymentDate: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Method</label><select className="form-control" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="mobile_banking">Mobile Banking</option><option value="other">Other</option>
                </select></div>
                <div className="form-group"><label>Reference #</label><input className="form-control" placeholder="Cheque/Transfer ref" value={payForm.referenceNumber} onChange={e => setPayForm({...payForm, referenceNumber: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Note</label><textarea className="form-control" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={paySaving} style={{ background: 'linear-gradient(135deg, var(--success), #059669)' }}>{paySaving ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="modal">
            <h3>Generate Report for {h.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-16px', marginBottom: '24px' }}>Choose a specific month or generate for all time</p>
            
            <div className="form-group">
              <label>Select Month</label>
              <input type="month" className="form-control" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => openReport('all')}>📄 All Time Report</button>
              <button className="btn btn-primary" onClick={() => openReport('month')}>📈 Monthly Report</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
