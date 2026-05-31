'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';

function ledgerEntryLabel(entry, t) {
  if (entry.kind === 'bill') {
    return entry.billType === 'receivable'
      ? t('accountHolderDetail.ledgerTheyOweYou')
      : t('accountHolderDetail.ledgerYouOweThem');
  }
  return entry.paymentType === 'received'
    ? t('accountHolderDetail.ledgerTheyPaidYou')
    : t('accountHolderDetail.ledgerYouPaidThem');
}

export default function LedgerTimeline({ ledger = [] }) {
  const { t, fmt, fmtDate } = useLanguage();
  const [ledgerFilter, setLedgerFilter] = useState('all');

  const filtered = useMemo(() => {
    if (ledgerFilter === 'statements') {
      return ledger.filter((e) => e.kind === 'bill');
    }
    if (ledgerFilter === 'payments') {
      return ledger.filter((e) => e.kind === 'payment');
    }
    return ledger;
  }, [ledger, ledgerFilter]);

  if (!ledger?.length) {
    return (
      <div className="card empty-state">
        <p>{t('accountHolderDetail.noBillsYet')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="filter-chips ledger-filter-chips">
        {['all', 'statements', 'payments'].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${ledgerFilter === f ? 'active' : ''}`}
            onClick={() => setLedgerFilter(f)}
          >
            {f === 'all'
              ? t('accountHolderDetail.ledgerFilterAll')
              : f === 'statements'
                ? t('accountHolderDetail.ledgerFilterStatements')
                : t('accountHolderDetail.ledgerFilterPayments')}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="ledger-list" style={{ padding: '0 16px' }}>
          {filtered.map((entry) => {
            const isBill = entry.kind === 'bill';
            const isIn = !isBill && entry.paymentType === 'received';
            const label = ledgerEntryLabel(entry, t);
            const amountColor = isBill
              ? entry.billType === 'receivable'
                ? 'var(--info)'
                : 'var(--danger)'
              : isIn
                ? 'var(--success)'
                : 'var(--danger)';

            return (
              <div key={`${entry.kind}-${entry.id}`} className="ledger-item">
                <div className={`ledger-icon ${isBill ? 'charge' : isIn ? 'in' : 'out'}`}>
                  {isBill ? (entry.category === 'loan' ? '🤝' : '📄') : '💰'}
                </div>
                <div className="ledger-body">
                  <div className="ledger-title">{label}</div>
                  <div className="ledger-meta">
                    {isBill
                      ? `${entry.billNumber}${entry.description ? ` — ${entry.description}` : ''}`
                      : entry.description || entry.billNumber || ''}
                  </div>
                  <div className="ledger-meta">{fmtDate(entry.date)}</div>
                </div>
                <div className="ledger-amounts">
                  <div className="ledger-amount" style={{ color: amountColor }}>
                    {fmt(entry.amount)}
                  </div>
                  <div className="ledger-balance">
                    {t('accountHolderDetail.balanceAfter')}: {fmt(Math.abs(entry.balance))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
