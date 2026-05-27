'use client';
import { useState, useEffect } from 'react';
import { cachedFetch } from '@/lib/fetchCache';
import { useLanguage } from '@/components/LanguageContext';

export default function ReportsPage() {
  const [holders, setHolders] = useState([]);
  const [statementHolder, setStatementHolder] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [langModal, setLangModal] = useState(null); // holds the report type when modal is open
  const { t } = useLanguage();

  useEffect(() => {
    cachedFetch('/api/account-holders').then(setHolders);
  }, []);

  const handleReportClick = (type) => {
    if (type === 'account-statement' && !statementHolder) {
      return alert(t('reports.selectHolderAlert'));
    }
    setLangModal(type);
  };

  const openReport = (lang) => {
    const type = langModal;
    let url = `/reports/${type}?lang=${lang}&`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    if (type === 'account-statement') {
      url += `holderId=${statementHolder}&`;
    }
    window.open(url, '_blank');
    setLangModal(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('sidebar.reports')}</h2>
          <p>{t('reports.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: 0 }}><h3>{t('reports.globalDateFilter')}</h3></div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{t('reports.dateFilterDesc')}</p>
        <div className="form-row">
          <div className="form-group"><label>{t('reports.startDate')}</label><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="form-group"><label>{t('reports.endDate')}</label><input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card" onClick={() => handleReportClick('outstanding')}>
          <div className="report-icon">⚠️</div>
          <h3>{t('reports.outstandingBalances')}</h3>
          <p>{t('reports.outstandingBalancesDesc')}</p>
        </div>
        
        <div className="report-card" onClick={() => handleReportClick('payments-summary')}>
          <div className="report-icon">💵</div>
          <h3>{t('reports.paymentSummary')}</h3>
          <p>{t('reports.paymentSummaryDesc')}</p>
        </div>

        <div className="report-card" onClick={() => handleReportClick('full-transactions')}>
          <div className="report-icon">📑</div>
          <h3>{t('reports.fullTransactions')}</h3>
          <p>{t('reports.fullTransactionsDesc')}</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="report-icon" style={{ fontSize: '32px', marginBottom: '16px' }}>👤</div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>{t('reports.accountStatement')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', flex: 1 }}>{t('reports.accountStatementDesc')}</p>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <select className="form-control" value={statementHolder} onChange={e => setStatementHolder(e.target.value)}>
              <option value="">{t('reports.selectHolderPlaceholder')}</option>
              {holders.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => handleReportClick('account-statement')} style={{ width: '100%', justifyContent: 'center' }}>{t('reports.generatePdf')}</button>
        </div>
      </div>

      {/* Language Selection Modal */}
      {langModal && (
        <div className="modal-overlay" onClick={() => setLangModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3>🌐 {t('accountHolderDetail.selectReportLang')}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
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
              className="btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
              onClick={() => setLangModal(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
