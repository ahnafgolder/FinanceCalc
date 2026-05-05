'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const fmt = (n) => `৳${(n || 0).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function ReportShell({ title, dateRange, children }) {
  return (
    <div style={{ background: '#fff', color: '#1a1a2e', minHeight: '100vh' }}>
      <style>{`
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .report-page { max-width: 900px; margin: 0 auto; padding: 40px; font-family: 'Inter', -apple-system, sans-serif; }
        .report-header { border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .report-title { font-size: 24px; font-weight: 800; color: #0f172a; }
        .report-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
        .report-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .report-table th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
        .report-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .report-table .right { text-align: right; }
        .report-table .bold { font-weight: 700; }
        .report-table .total-row td { border-top: 2px solid #0f172a; font-weight: 700; font-size: 14px; background: #f8fafc; }
        .summary-boxes { display: flex; gap: 16px; margin-bottom: 24px; }
        .summary-box { flex: 1; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .summary-box .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-box .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
        .section-title { font-size: 16px; font-weight: 700; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; }
        .info-item .info-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
        .info-item .info-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
        .badge-bill { color: #ef4444; font-weight: 600; }
        .badge-pay { color: #10b981; font-weight: 600; }
        .print-bar { background: #111827; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .print-btn { background: linear-gradient(135deg, #f59e0b, #d97706); color: #0a0e1a; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }
      `}</style>
      <div className="no-print print-bar">
        <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>📄 {title}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="print-btn" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        </div>
      </div>
      <div className="report-page">
        <div className="report-header">
          <div>
            <div className="report-title">{title}</div>
            <div className="report-sub">FinanceCalc • {dateRange} • Generated {fmtDate(new Date())}</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>FC</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function OutstandingReport({ data, dateRange }) {
  const totalBilled = data.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = data.reduce((s, b) => s + b.paid, 0);
  const totalRemaining = data.reduce((s, b) => s + b.remaining, 0);
  return (
    <ReportShell title="Outstanding Balances Report" dateRange={dateRange}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">Total Billed</div><div className="value">{fmt(totalBilled)}</div></div>
        <div className="summary-box"><div className="label">Total Paid</div><div className="value" style={{ color: '#10b981' }}>{fmt(totalPaid)}</div></div>
        <div className="summary-box"><div className="label">Outstanding</div><div className="value" style={{ color: '#ef4444' }}>{fmt(totalRemaining)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>Bill #</th><th>Account Holder</th><th>Status</th><th className="right">Billed</th><th className="right">Paid</th><th className="right">Remaining</th></tr></thead>
        <tbody>
          {data.map((b, i) => (
            <tr key={i}><td className="bold">{b.billNumber}</td><td>{b.accountHolderId?.name || '—'}</td><td>{b.status?.toUpperCase()}</td><td className="right">{fmt(b.totalAmount)}</td><td className="right">{fmt(b.paid)}</td><td className="right bold">{fmt(b.remaining)}</td></tr>
          ))}
          <tr className="total-row"><td colSpan="3">TOTAL ({data.length} bills)</td><td className="right">{fmt(totalBilled)}</td><td className="right">{fmt(totalPaid)}</td><td className="right">{fmt(totalRemaining)}</td></tr>
        </tbody>
      </table>
    </ReportShell>
  );
}

function PaymentSummaryReport({ data, dateRange }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const count = data.reduce((s, d) => s + d.count, 0);
  return (
    <ReportShell title="Payment Summary Report" dateRange={dateRange}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">Total Payments</div><div className="value">{count}</div></div>
        <div className="summary-box"><div className="label">Grand Total</div><div className="value" style={{ color: '#10b981' }}>{fmt(total)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>Account Holder</th><th className="right">Payments</th><th className="right">Total Amount</th></tr></thead>
        <tbody>
          {data.map((d, i) => (<tr key={i}><td>{d.name}</td><td className="right">{d.count}</td><td className="right bold">{fmt(d.total)}</td></tr>))}
          <tr className="total-row"><td>GRAND TOTAL</td><td className="right">{count}</td><td className="right">{fmt(total)}</td></tr>
        </tbody>
      </table>
    </ReportShell>
  );
}

function FullTransactionsReport({ data, dateRange }) {
  const totalBills = data.filter(t => t.type === 'BILL').reduce((s, t) => s + t.amount, 0);
  const totalPayments = data.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
  return (
    <ReportShell title="Full Transactions Report" dateRange={dateRange}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">Total Billed</div><div className="value" style={{ color: '#ef4444' }}>{fmt(totalBills)}</div></div>
        <div className="summary-box"><div className="label">Total Paid</div><div className="value" style={{ color: '#10b981' }}>{fmt(totalPayments)}</div></div>
        <div className="summary-box"><div className="label">Net Outstanding</div><div className="value">{fmt(totalBills - totalPayments)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>Date</th><th>Type</th><th>Account Holder</th><th>Reference</th><th className="right">Amount</th></tr></thead>
        <tbody>
          {data.map((t, i) => (
            <tr key={i}><td>{fmtDate(t.date)}</td><td className={t.type === 'BILL' ? 'badge-bill' : 'badge-pay'}>{t.type}</td><td>{t.holder || '—'}</td><td>{t.ref || '—'}</td><td className={`right bold ${t.type === 'BILL' ? 'badge-bill' : 'badge-pay'}`}>{t.type === 'BILL' ? '-' : '+'}{fmt(t.amount)}</td></tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function AccountStatementReport({ data, dateRange }) {
  const { holder, bills, payments } = data;
  const totalBilled = bills?.reduce((s, b) => s + b.totalAmount, 0) || 0;
  const totalPaid = payments?.reduce((s, p) => s + p.amount, 0) || 0;
  return (
    <ReportShell title="Account Statement" dateRange={dateRange}>
      <div className="info-grid">
        <div className="info-item"><div className="info-label">Name</div><div className="info-value">{holder?.name}</div></div>
        <div className="info-item"><div className="info-label">Type</div><div className="info-value">{holder?.type?.toUpperCase()}</div></div>
        {holder?.bankName && <div className="info-item"><div className="info-label">Bank</div><div className="info-value">{holder.bankName}</div></div>}
        {holder?.phone && <div className="info-item"><div className="info-label">Phone</div><div className="info-value">{holder.phone}</div></div>}
        {holder?.email && <div className="info-item"><div className="info-label">Email</div><div className="info-value">{holder.email}</div></div>}
        {holder?.address && <div className="info-item"><div className="info-label">Address</div><div className="info-value">{holder.address}</div></div>}
      </div>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">Total Billed</div><div className="value">{fmt(totalBilled)}</div></div>
        <div className="summary-box"><div className="label">Total Paid</div><div className="value" style={{ color: '#10b981' }}>{fmt(totalPaid)}</div></div>
        <div className="summary-box"><div className="label">Outstanding</div><div className="value" style={{ color: totalBilled - totalPaid > 0 ? '#ef4444' : '#10b981' }}>{fmt(totalBilled - totalPaid)}</div></div>
      </div>
      <div className="section-title">Bills ({bills?.length || 0})</div>
      <table className="report-table">
        <thead><tr><th>Bill #</th><th>Description</th><th>Date</th><th>Status</th><th className="right">Amount</th></tr></thead>
        <tbody>
          {bills?.map((b, i) => (<tr key={i}><td className="bold">{b.billNumber}</td><td>{b.description || '—'}</td><td>{fmtDate(b.createdAt)}</td><td>{b.status?.toUpperCase()}</td><td className="right bold">{fmt(b.totalAmount)}</td></tr>))}
        </tbody>
      </table>
      <div className="section-title">Payments ({payments?.length || 0})</div>
      <table className="report-table">
        <thead><tr><th>Date</th><th>Bill</th><th>Method</th><th>Note</th><th className="right">Amount</th></tr></thead>
        <tbody>
          {payments?.map((p, i) => (<tr key={i}><td>{fmtDate(p.paymentDate)}</td><td>{p.billId?.billNumber || '—'}</td><td>{p.paymentMethod?.replace('_', ' ')}</td><td>{p.note || '—'}</td><td className="right bold" style={{ color: '#10b981' }}>{fmt(p.amount)}</td></tr>))}
        </tbody>
      </table>
    </ReportShell>
  );
}

export default function ReportViewer() {
  const { type } = useParams();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (searchParams.get('holderId')) params.set('holderId', searchParams.get('holderId'));

    fetch(`/api/reports?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type, searchParams, startDate, endDate]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}><div className="spinner" /></div>;
  if (!data) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}><p>No data available.</p></div>;

  switch (type) {
    case 'outstanding': return <OutstandingReport data={data} dateRange={dateRange} />;
    case 'payments-summary': return <PaymentSummaryReport data={data} dateRange={dateRange} />;
    case 'full-transactions': return <FullTransactionsReport data={data} dateRange={dateRange} />;
    case 'account-statement': return <AccountStatementReport data={data} dateRange={dateRange} />;
    default: return <div style={{ padding: '60px', textAlign: 'center', color: '#fff', background: '#0a0e1a', minHeight: '100vh' }}>Unknown report type</div>;
  }
}
