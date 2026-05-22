'use client';
import { useState, useEffect } from 'react';
import { cachedFetch, getCachedData, invalidateCache } from '@/lib/fetchCache';

export default function PaymentsPage() {
  const [payments, setPayments] = useState(() => getCachedData('/api/payments') || []);
  const [loading, setLoading] = useState(payments.length === 0);

  const fetchData = () => cachedFetch('/api/payments').then(d => { setPayments(d); setLoading(false); });
  useEffect(() => { fetchData(); }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment?')) return;
    await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    invalidateCache('/api/payments');
    invalidateCache('/api/dashboard');
    invalidateCache('/api/bills');
    setLoading(true);
    fetchData();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="page-header">
        <div><h2>Payments</h2><p>All payment records — Total: {fmt(total)}</p></div>
      </div>

      {payments.length > 0 ? (
        <div className="card"><div className="table-container"><table>
          <thead><tr><th>Date</th><th>Type</th><th>Account Holder</th><th>Bill</th><th>Amount</th><th>Method</th><th>Reference</th><th>Note</th><th></th></tr></thead>
          <tbody>{payments.map(p => (
            <tr key={p._id}>
              <td>{fmtDate(p.paymentDate)}</td>
              <td><span className={`badge badge-${p.type === 'received' ? 'success' : 'danger'}`}>{p.type === 'received' ? 'Received' : 'Paid'}</span></td>
              <td>{p.accountHolderId?.name || '—'}</td>
              <td style={{ color: 'var(--accent)' }}>{p.billId?.billNumber || '—'}</td>
              <td style={{ color: p.type === 'received' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{fmt(p.amount)}</td>
              <td>{p.paymentMethod?.replace('_', ' ')}</td>
              <td>{p.referenceNumber || '—'}</td>
              <td>{p.note || '—'}</td>
              <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(p._id)} title="Delete">×</button></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">💰</div>
          <h3>No Payments Yet</h3>
          <p>Payments appear here when you record them against bills</p>
        </div>
      )}
    </>
  );
}
