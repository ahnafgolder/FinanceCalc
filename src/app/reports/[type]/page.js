'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/* ── Translations ── */
const translations = {
  en: {
    currency: (n) => `৳${(n || 0).toLocaleString('en-US')}`,
    fmtDate: (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    brandLine: (dateRange) => `FinanceCalc • ${dateRange} • Generated`,
    print: '🖨️ Print / Save PDF',
    back: '← Go Back',
    // Outstanding
    outstandingTitle: 'Outstanding Balances Report',
    totalBilled: 'Total Billed',
    totalPaid: 'Total Paid',
    outstanding: 'Outstanding',
    billNo: 'Bill #',
    accountHolder: 'Account Holder',
    status: 'Status',
    billed: 'Billed',
    paid: 'Paid',
    remaining: 'Remaining',
    total: 'TOTAL',
    bills: 'bills',
    // Payment Summary
    paymentSummaryTitle: 'Payment Summary Report',
    totalPayments: 'Total Payments',
    grandTotal: 'Grand Total',
    payments: 'Payments',
    totalAmount: 'Total Amount',
    grandTotalLabel: 'GRAND TOTAL',
    // Full Transactions
    fullTransactionsTitle: 'Full Transactions Report',
    netOutstanding: 'Net Outstanding',
    date: 'Date',
    type: 'Type',
    reference: 'Reference',
    amount: 'Amount',
    billType: 'BILL',
    paymentType: 'PAYMENT',
    // Account Statement
    accountStatementTitle: 'Account Statement',
    name: 'Name',
    holderType: 'Type',
    bank: 'Bank',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    description: 'Description',
    bill: 'Bill',
    method: 'Method',
    note: 'Note',
    // Misc
    noData: 'No data available.',
    unknownReport: 'Unknown report type',
  },
  bn: {
    currency: (n) => `৳${(n || 0).toLocaleString('bn-BD')}`,
    fmtDate: (d) => new Date(d).toLocaleDateString('bn-BD', { month: 'long', day: 'numeric', year: 'numeric' }),
    brandLine: (dateRange) => `ফাইন্যান্সক্যালক • ${dateRange} • তারিখ`,
    print: '🖨️ প্রিন্ট / পিডিএফ সংরক্ষণ',
    back: '← ফিরে যান',
    // Outstanding
    outstandingTitle: 'বকেয়া ব্যালেন্স রিপোর্ট',
    totalBilled: 'মোট বিল',
    totalPaid: 'মোট পরিশোধিত',
    outstanding: 'বকেয়া',
    billNo: 'বিল নং',
    accountHolder: 'হিসাবধারী',
    status: 'অবস্থা',
    billed: 'বিলকৃত',
    paid: 'পরিশোধিত',
    remaining: 'অবশিষ্ট',
    total: 'মোট',
    bills: 'বিল',
    // Payment Summary
    paymentSummaryTitle: 'পেমেন্ট সারাংশ রিপোর্ট',
    totalPayments: 'মোট পেমেন্ট',
    grandTotal: 'সর্বমোট',
    payments: 'পেমেন্ট সংখ্যা',
    totalAmount: 'মোট পরিমাণ',
    grandTotalLabel: 'সর্বমোট',
    // Full Transactions
    fullTransactionsTitle: 'সম্পূর্ণ লেনদেন রিপোর্ট',
    netOutstanding: 'নিট বকেয়া',
    date: 'তারিখ',
    type: 'ধরন',
    reference: 'রেফারেন্স',
    amount: 'পরিমাণ',
    billType: 'বিল',
    paymentType: 'পেমেন্ট',
    // Account Statement
    accountStatementTitle: 'হিসাব বিবরণী',
    name: 'নাম',
    holderType: 'ধরন',
    bank: 'ব্যাংক',
    phone: 'ফোন',
    email: 'ইমেইল',
    address: 'ঠিকানা',
    description: 'বিবরণ',
    bill: 'বিল',
    method: 'পদ্ধতি',
    note: 'নোট',
    // Misc
    noData: 'কোনো তথ্য পাওয়া যায়নি।',
    unknownReport: 'অজানা রিপোর্ট ধরন',
  },
};

/* ── Status translation helper ── */
const statusMap = {
  en: { unpaid: 'UNPAID', partial: 'PARTIAL', paid: 'PAID', overdue: 'OVERDUE' },
  bn: { unpaid: 'অপরিশোধিত', partial: 'আংশিক', paid: 'পরিশোধিত', overdue: 'মেয়াদোত্তীর্ণ' },
};

const translateStatus = (status, lang) => {
  const key = status?.toLowerCase();
  return statusMap[lang]?.[key] || status?.toUpperCase() || '—';
};

/* ── Payment method translation ── */
const methodMap = {
  en: { cash: 'Cash', bank_transfer: 'Bank Transfer', mobile_banking: 'Mobile Banking', cheque: 'Cheque', other: 'Other' },
  bn: { cash: 'নগদ', bank_transfer: 'ব্যাংক ট্রান্সফার', mobile_banking: 'মোবাইল ব্যাংকিং', cheque: 'চেক', other: 'অন্যান্য' },
};

const translateMethod = (method, lang) => {
  const key = method?.toLowerCase()?.replace(' ', '_');
  return methodMap[lang]?.[key] || method?.replace('_', ' ') || '—';
};

/* ── Report Shell ── */
function ReportShell({ title, dateRange, lang, children }) {
  const t = translations[lang];
  const fontFamily = lang === 'bn'
    ? "'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', -apple-system, sans-serif"
    : "'Inter', -apple-system, sans-serif";

  return (
    <div style={{ background: '#fff', color: '#1a1a2e', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap');
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .report-page { padding: 16px !important; }
          .summary-boxes { gap: 8px !important; }
          .summary-box { padding: 10px !important; }
          .summary-box .value { font-size: 16px !important; }
          .info-grid { grid-template-columns: 1fr !important; padding: 12px !important; }
        }
        .report-page { max-width: 900px; margin: 0 auto; padding: 40px; font-family: ${fontFamily}; }
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
        .back-btn { background: #374151; color: #f9fafb; border: 1px solid #4b5563; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .back-btn:hover { background: #4b5563; }
      `}</style>
      <div className="no-print print-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="back-btn" onClick={() => window.history.back()}>{t.back}</button>
          <span className="hide-mobile" style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>📄 {title}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="print-btn" onClick={() => window.print()}>{t.print}</button>
        </div>
      </div>
      <div className="report-page">
        <div className="report-header">
          <div>
            <div className="report-title">{title}</div>
            <div className="report-sub">{t.brandLine(dateRange)} {t.fmtDate(new Date())}</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>FC</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function OutstandingReport({ data, dateRange, lang }) {
  const t = translations[lang];
  const totalBilled = data.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = data.reduce((s, b) => s + b.paid, 0);
  const totalRemaining = data.reduce((s, b) => s + b.remaining, 0);
  return (
    <ReportShell title={t.outstandingTitle} dateRange={dateRange} lang={lang}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">{t.totalBilled}</div><div className="value">{t.currency(totalBilled)}</div></div>
        <div className="summary-box"><div className="label">{t.totalPaid}</div><div className="value" style={{ color: '#10b981' }}>{t.currency(totalPaid)}</div></div>
        <div className="summary-box"><div className="label">{t.outstanding}</div><div className="value" style={{ color: '#ef4444' }}>{t.currency(totalRemaining)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>{t.billNo}</th><th>{t.accountHolder}</th><th>{t.status}</th><th className="right">{t.billed}</th><th className="right">{t.paid}</th><th className="right">{t.remaining}</th></tr></thead>
        <tbody>
          {data.map((b, i) => (
            <tr key={i}><td className="bold">{b.billNumber}</td><td>{b.accountHolderId?.name || '—'}</td><td>{translateStatus(b.status, lang)}</td><td className="right">{t.currency(b.totalAmount)}</td><td className="right">{t.currency(b.paid)}</td><td className="right bold">{t.currency(b.remaining)}</td></tr>
          ))}
          <tr className="total-row"><td colSpan="3">{t.total} ({data.length} {t.bills})</td><td className="right">{t.currency(totalBilled)}</td><td className="right">{t.currency(totalPaid)}</td><td className="right">{t.currency(totalRemaining)}</td></tr>
        </tbody>
      </table>
    </ReportShell>
  );
}

function PaymentSummaryReport({ data, dateRange, lang }) {
  const t = translations[lang];
  const total = data.reduce((s, d) => s + d.total, 0);
  const count = data.reduce((s, d) => s + d.count, 0);
  return (
    <ReportShell title={t.paymentSummaryTitle} dateRange={dateRange} lang={lang}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">{t.totalPayments}</div><div className="value">{lang === 'bn' ? count.toLocaleString('bn-BD') : count}</div></div>
        <div className="summary-box"><div className="label">{t.grandTotal}</div><div className="value" style={{ color: '#10b981' }}>{t.currency(total)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>{t.accountHolder}</th><th className="right">{t.payments}</th><th className="right">{t.totalAmount}</th></tr></thead>
        <tbody>
          {data.map((d, i) => (<tr key={i}><td>{d.name}</td><td className="right">{lang === 'bn' ? d.count.toLocaleString('bn-BD') : d.count}</td><td className="right bold">{t.currency(d.total)}</td></tr>))}
          <tr className="total-row"><td>{t.grandTotalLabel}</td><td className="right">{lang === 'bn' ? count.toLocaleString('bn-BD') : count}</td><td className="right">{t.currency(total)}</td></tr>
        </tbody>
      </table>
    </ReportShell>
  );
}

function FullTransactionsReport({ data, dateRange, lang }) {
  const t = translations[lang];
  const totalBills = data.filter(tx => tx.type === 'BILL').reduce((s, tx) => s + tx.amount, 0);
  const totalPayments = data.filter(tx => tx.type === 'PAYMENT').reduce((s, tx) => s + tx.amount, 0);
  return (
    <ReportShell title={t.fullTransactionsTitle} dateRange={dateRange} lang={lang}>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">{t.totalBilled}</div><div className="value" style={{ color: '#ef4444' }}>{t.currency(totalBills)}</div></div>
        <div className="summary-box"><div className="label">{t.totalPaid}</div><div className="value" style={{ color: '#10b981' }}>{t.currency(totalPayments)}</div></div>
        <div className="summary-box"><div className="label">{t.netOutstanding}</div><div className="value">{t.currency(totalBills - totalPayments)}</div></div>
      </div>
      <table className="report-table">
        <thead><tr><th>{t.date}</th><th>{t.type}</th><th>{t.accountHolder}</th><th>{t.reference}</th><th className="right">{t.amount}</th></tr></thead>
        <tbody>
          {data.map((tx, i) => (
            <tr key={i}><td>{t.fmtDate(tx.date)}</td><td className={tx.type === 'BILL' ? 'badge-bill' : 'badge-pay'}>{tx.type === 'BILL' ? t.billType : t.paymentType}</td><td>{tx.holder || '—'}</td><td>{tx.ref || '—'}</td><td className={`right bold ${tx.type === 'BILL' ? 'badge-bill' : 'badge-pay'}`}>{tx.type === 'BILL' ? '-' : '+'}{t.currency(tx.amount)}</td></tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function AccountStatementReport({ data, dateRange, lang }) {
  const t = translations[lang];
  const { holder, bills, payments } = data;
  const totalBilled = bills?.reduce((s, b) => s + b.totalAmount, 0) || 0;
  const totalPaid = payments?.reduce((s, p) => s + p.amount, 0) || 0;
  return (
    <ReportShell title={t.accountStatementTitle} dateRange={dateRange} lang={lang}>
      <div className="info-grid">
        <div className="info-item"><div className="info-label">{t.name}</div><div className="info-value">{holder?.name}</div></div>
        <div className="info-item"><div className="info-label">{t.holderType}</div><div className="info-value">{holder?.type?.toUpperCase()}</div></div>
        {holder?.bankName && <div className="info-item"><div className="info-label">{t.bank}</div><div className="info-value">{holder.bankName}</div></div>}
        {holder?.phone && <div className="info-item"><div className="info-label">{t.phone}</div><div className="info-value">{holder.phone}</div></div>}
        {holder?.email && <div className="info-item"><div className="info-label">{t.email}</div><div className="info-value">{holder.email}</div></div>}
        {holder?.address && <div className="info-item"><div className="info-label">{t.address}</div><div className="info-value">{holder.address}</div></div>}
      </div>
      <div className="summary-boxes">
        <div className="summary-box"><div className="label">{t.totalBilled}</div><div className="value">{t.currency(totalBilled)}</div></div>
        <div className="summary-box"><div className="label">{t.totalPaid}</div><div className="value" style={{ color: '#10b981' }}>{t.currency(totalPaid)}</div></div>
        <div className="summary-box"><div className="label">{t.outstanding}</div><div className="value" style={{ color: totalBilled - totalPaid > 0 ? '#ef4444' : '#10b981' }}>{t.currency(totalBilled - totalPaid)}</div></div>
      </div>
      <div className="section-title">{t.bills} ({lang === 'bn' ? (bills?.length || 0).toLocaleString('bn-BD') : (bills?.length || 0)})</div>
      <table className="report-table">
        <thead><tr><th>{t.billNo}</th><th>{t.description}</th><th>{t.date}</th><th>{t.status}</th><th className="right">{t.amount}</th></tr></thead>
        <tbody>
          {bills?.map((b, i) => (<tr key={i}><td className="bold">{b.billNumber}</td><td>{b.description || '—'}</td><td>{t.fmtDate(b.createdAt)}</td><td>{translateStatus(b.status, lang)}</td><td className="right bold">{t.currency(b.totalAmount)}</td></tr>))}
        </tbody>
      </table>
      <div className="section-title">{t.paid} ({lang === 'bn' ? (payments?.length || 0).toLocaleString('bn-BD') : (payments?.length || 0)})</div>
      <table className="report-table">
        <thead><tr><th>{t.date}</th><th>{t.bill}</th><th>{t.method}</th><th>{t.note}</th><th className="right">{t.amount}</th></tr></thead>
        <tbody>
          {payments?.map((p, i) => (<tr key={i}><td>{t.fmtDate(p.paymentDate)}</td><td>{p.billId?.billNumber || '—'}</td><td>{translateMethod(p.paymentMethod, lang)}</td><td>{p.note || '—'}</td><td className="right bold" style={{ color: '#10b981' }}>{t.currency(p.amount)}</td></tr>))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function ReportViewerContent() {
  const { type } = useParams();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const lang = searchParams.get('lang') === 'bn' ? 'bn' : 'en';
  const t = translations[lang];
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  let dateRange;
  if (lang === 'bn') {
    dateRange = startDate && endDate ? `${startDate} থেকে ${endDate}` : startDate ? `${startDate} থেকে` : endDate ? `${endDate} পর্যন্ত` : 'সর্বকালীন';
  } else {
    dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';
  }

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
  if (!data) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}><p>{t.noData}</p></div>;

  switch (type) {
    case 'outstanding': return <OutstandingReport data={data} dateRange={dateRange} lang={lang} />;
    case 'payments-summary': return <PaymentSummaryReport data={data} dateRange={dateRange} lang={lang} />;
    case 'full-transactions': return <FullTransactionsReport data={data} dateRange={dateRange} lang={lang} />;
    case 'account-statement': return <AccountStatementReport data={data} dateRange={dateRange} lang={lang} />;
    default: return <div style={{ padding: '60px', textAlign: 'center', color: '#fff', background: '#0a0e1a', minHeight: '100vh' }}>{t.unknownReport}</div>;
  }
}

export default function ReportViewer() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}><div className="spinner" /></div>}>
      <ReportViewerContent />
    </Suspense>
  );
}
