'use client';
import { useState, useEffect } from 'react';
import { cachedFetch } from '@/lib/fetchCache';

export default function ReportsPage() {
  const [holders, setHolders] = useState([]);
  const [statementHolder, setStatementHolder] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    cachedFetch('/api/account-holders').then(setHolders);
  }, []);

  const openReport = (type) => {
    let url = `/reports/${type}?`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    if (type === 'account-statement') {
      if (!statementHolder) return alert('Please select an account holder');
      url += `holderId=${statementHolder}&`;
    }
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Reports</h2><p>Generate and export PDF reports</p></div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: 0 }}><h3>Global Date Filter (Optional)</h3></div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Apply a date range to your reports. Leave blank for all time.</p>
        <div className="form-row">
          <div className="form-group"><label>Start Date</label><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="form-group"><label>End Date</label><input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card" onClick={() => openReport('outstanding')}>
          <div className="report-icon">⚠️</div>
          <h3>Outstanding Balances</h3>
          <p>A list of all unpaid and partially paid bills across all account holders.</p>
        </div>
        
        <div className="report-card" onClick={() => openReport('payments-summary')}>
          <div className="report-icon">💵</div>
          <h3>Payment Summary</h3>
          <p>Total payments received/sent, grouped by account holder.</p>
        </div>

        <div className="report-card" onClick={() => openReport('full-transactions')}>
          <div className="report-icon">📑</div>
          <h3>Full Transactions</h3>
          <p>A combined chronological list of all bills and payments.</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="report-icon" style={{ fontSize: '32px', marginBottom: '16px' }}>👤</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Account Statement</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', flex: 1 }}>Complete history of bills and payments for a specific account holder.</p>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <select className="form-control" value={statementHolder} onChange={e => setStatementHolder(e.target.value)}>
              <option value="">Select Account Holder...</option>
              {holders.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => openReport('account-statement')} style={{ width: '100%', justifyContent: 'center' }}>Generate PDF</button>
        </div>
      </div>
    </>
  );
}
