'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    fetch(`/api/bills${params}`).then(r => r.json()).then(d => { setBills(d); setLoading(false); });
  }, [statusFilter]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <div><h2>Bills</h2><p>Track all your invoices and bills</p></div>
        <Link href="/bills/new" className="btn btn-primary">+ New Bill</Link>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={statusFilter} onChange={e => { setLoading(true); setStatusFilter(e.target.value); }}>
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {bills.length > 0 ? (
        <div className="card"><div className="table-container"><table>
          <thead><tr><th>Bill #</th><th>Type</th><th>Account Holder</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>{bills.map(b => (
            <tr key={b._id} onClick={() => router.push(`/bills/${b._id}`)} style={{ cursor: 'pointer' }}>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{b.billNumber}</td>
              <td><span className={`badge badge-${b.type === 'receivable' ? 'success' : 'danger'}`}>{b.type === 'receivable' ? 'Receivable' : 'Payable'}</span></td>
              <td>{b.accountHolderId?.name || '—'}</td>
              <td>{b.description || '—'}</td>
              <td>{fmt(b.totalAmount)}</td>
              <td>{b.dueDate ? fmtDate(b.dueDate) : '—'}</td>
              <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
              <td>{fmtDate(b.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Bills Yet</h3>
          <p>Create your first bill to start tracking</p>
          <Link href="/bills/new" className="btn btn-primary">+ Create Bill</Link>
        </div>
      )}
    </>
  );
}
