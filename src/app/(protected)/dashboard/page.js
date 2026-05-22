'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cachedFetch, getCachedData } from '@/lib/fetchCache';

export default function Dashboard() {
  const [data, setData] = useState(() => getCachedData('/api/dashboard'));
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    cachedFetch('/api/dashboard').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const s = data?.stats || {};

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your financial activity</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card success">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(s.totalCollected)}</div>
          <div className="stat-sub">Money Received</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Total Paid Out</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(s.totalPaidOut)}</div>
          <div className="stat-sub">Money Sent</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Outstanding Receivables</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(s.outstandingReceivable)}</div>
          <div className="stat-sub">To be collected</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Outstanding Payables</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(s.outstandingPayable)}</div>
          <div className="stat-sub">To be paid</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="section-header">
            <h3>Recent Bills</h3>
            <Link href="/bills" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {data?.recentBills?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Bill #</th><th>Account</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recentBills.map(b => (
                    <tr key={b._id}>
                      <td><Link href={`/bills/${b._id}`} style={{ color: 'var(--accent)' }}>{b.billNumber}</Link></td>
                      <td>{b.accountHolderId?.name || '—'}</td>
                      <td>{fmt(b.totalAmount)}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><p>No bills yet</p></div>}
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Recent Payments</h3>
            <Link href="/payments" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {data?.recentPayments?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Account</th><th>Bill</th><th>Amount</th></tr></thead>
                <tbody>
                  {data.recentPayments.map(p => (
                    <tr key={p._id}>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td>{p.accountHolderId?.name || '—'}</td>
                      <td>{p.billId?.billNumber || '—'}</td>
                      <td style={{ color: 'var(--success)' }}>{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><p>No payments yet</p></div>}
        </div>
      </div>
    </>
  );
}
