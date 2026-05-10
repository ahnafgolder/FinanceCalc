'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'cash', referenceNumber: '', note: '', paymentDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const fetchData = () => fetch(`/api/bills/${id}`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  useEffect(() => { fetchData(); }, [id]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this bill and all its payments?')) return;
    await fetch(`/api/bills/${id}`, { method: 'DELETE' });
    router.push('/bills');
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data?.bill) return <div className="empty-state"><h3>Not Found</h3></div>;

  const b = data.bill;
  const pct = b.totalAmount > 0 ? Math.min((data.totalPaid / b.totalAmount) * 100, 100) : 0;

  return (
    <>
      <div className="detail-header">
        <div>
          <Link href="/bills" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>← Back to Bills</Link>
          <h2 style={{ marginTop: '8px' }}>{b.billNumber}</h2>
          <span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`} style={{ marginRight: '8px' }}>{b.type === 'receivable' ? 'Receivable' : 'Payable'}</span>
          <span className={`badge badge-${b.status}`}>{b.status}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {b.status !== 'paid' && <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>💰 {b.type === 'receivable' ? 'Collect Money' : 'Record Payment'}</button>}
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card info"><div className="stat-label">Bill Amount</div><div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(b.totalAmount)}</div></div>
        <div className="stat-card success"><div className="stat-label">Paid</div><div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(data.totalPaid)}</div></div>
        <div className="stat-card danger"><div className="stat-label">Remaining</div><div className="stat-value" style={{ color: data.remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(data.remaining)}</div></div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Payment Progress</span>
          <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--success))', borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div className="detail-grid" style={{ marginBottom: '32px' }}>
        <div className="detail-item"><div className="detail-label">Account Holder</div><div className="detail-value"><Link href={`/account-holders/${b.accountHolderId?._id}`} style={{ color: 'var(--accent)' }}>{b.accountHolderId?.name}</Link></div></div>
        <div className="detail-item"><div className="detail-label">Description</div><div className="detail-value">{b.description || '—'}</div></div>
        <div className="detail-item"><div className="detail-label">Due Date</div><div className="detail-value">{b.dueDate ? fmtDate(b.dueDate) : 'No due date'}</div></div>
        <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{fmtDate(b.createdAt)}</div></div>
      </div>

      <div className="section">
        <div className="section-header"><h3>Payments ({data.payments?.length || 0})</h3></div>
        {data.payments?.length > 0 ? (
          <div className="card"><div className="table-container"><table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Note</th></tr></thead>
            <tbody>{data.payments.map(p => (
              <tr key={p._id}>
                <td>{fmtDate(p.paymentDate)}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.amount)}</td>
                <td>{p.paymentMethod?.replace('_', ' ')}</td>
                <td>{p.referenceNumber || '—'}</td>
                <td>{p.note || '—'}</td>
              </tr>
            ))}</tbody>
          </table></div></div>
        ) : <div className="card empty-state"><p>No payments recorded yet</p></div>}
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPayment(false); }}>
          <div className="modal">
            <h3>{data.bill.type === 'receivable' ? 'Collect Money' : 'Record Payment'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', marginTop: '-16px' }}>Remaining: {fmt(data.remaining)}</p>
            <form onSubmit={handlePayment}>
              <div className="form-row">
                <div className="form-group"><label>Amount *</label><input className="form-control" type="number" step="0.01" min="0" max={data.remaining} value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required /></div>
                <div className="form-group"><label>Date *</label><input className="form-control" type="date" value={payForm.paymentDate} onChange={e => setPayForm({...payForm, paymentDate: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Method</label><select className="form-control" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="mobile_banking">Mobile Banking</option><option value="other">Other</option>
                </select></div>
                <div className="form-group"><label>Reference #</label><input className="form-control" value={payForm.referenceNumber} onChange={e => setPayForm({...payForm, referenceNumber: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Note</label><textarea className="form-control" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (data.bill.type === 'receivable' ? 'Collect Payment' : 'Record Payment')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
