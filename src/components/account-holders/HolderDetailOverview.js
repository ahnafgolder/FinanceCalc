'use client';

import OpenStatementCard from '@/components/account-holders/OpenStatementCard';
import { useLanguage } from '@/components/LanguageContext';
import { getPrimaryOutstanding } from '@/lib/ledger';

export default function HolderDetailOverview({
  data,
  onAddStatement,
  onOpenPay,
  onShowReport,
  balanceSummaryText,
}) {
  const { t, fmt } = useLanguage();

  const h = data.holder;
  const primary = getPrimaryOutstanding(data);
  const heroClass =
    primary.direction === 'owesMe' ? 'owes-me' : primary.direction === 'iOwe' ? 'i-owe' : 'settled';

  const balanceLabel =
    primary.direction === 'owesMe'
      ? t('dashboard.theyOweYou')
      : primary.direction === 'iOwe'
        ? t('dashboard.youOweThem')
        : t('dashboard.settled');

  const openStatements = data.openStatements || [];
  const summary = data.summary || {};

  return (
    <>
      <div className={`balance-hero ${heroClass}`}>
        <div className="balance-hero-label">{balanceLabel}</div>
        <div
          className="balance-hero-amount"
          style={{
            color:
              primary.direction === 'settled'
                ? 'var(--success)'
                : primary.direction === 'owesMe'
                  ? 'var(--info)'
                  : 'var(--danger)',
          }}
        >
          {primary.direction === 'settled' ? '✓' : fmt(primary.amount)}
        </div>
        {balanceSummaryText && (
          <p className="balance-hero-summary">{balanceSummaryText}</p>
        )}
        {h.type === 'both' && (data.outstandingReceivable > 0 || data.outstandingPayable > 0) && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {t('dashboard.theyOweYou')}: {fmt(data.outstandingReceivable || 0)} ·{' '}
            {t('dashboard.youOweThem')}: {fmt(data.outstandingPayable || 0)}
          </p>
        )}
        <div className="balance-hero-actions">
          {primary.direction !== 'settled' && openStatements.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => onOpenPay()}>
              {primary.direction === 'owesMe'
                ? `💰 ${t('dashboard.collect')}`
                : `💸 ${t('dashboard.pay')}`}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onAddStatement}>
            + {t('dashboard.charge')}
          </button>
        </div>
      </div>

      <div className="stat-pills">
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.openCount ?? 0}</div>
          <div className="stat-pill-label">{t('accountHolderDetail.statOpen')}</div>
        </div>
        <div className="stat-pill">
          <div
            className="stat-pill-value"
            style={{ color: (summary.overdueCount || 0) > 0 ? 'var(--danger)' : undefined }}
          >
            {summary.overdueCount ?? 0}
          </div>
          <div className="stat-pill-label">{t('accountHolderDetail.statOverdue')}</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value" style={{ color: 'var(--success)', fontSize: '16px' }}>
            {fmt(data.totalCollected || 0)}
          </div>
          <div className="stat-pill-label">{t('accountHolderDetail.statCollected')}</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value" style={{ fontSize: '16px' }}>
            {fmt(data.totalPaidOut || 0)}
          </div>
          <div className="stat-pill-label">{t('accountHolderDetail.statPaidOut')}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <div>
            <h3>{t('accountHolderDetail.openStatements')}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t('accountHolderDetail.openStatementsSub')}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onShowReport}>
            📈 {t('accountHolderDetail.report')}
          </button>
        </div>
        {openStatements.length > 0 ? (
          openStatements.map((b) => (
            <OpenStatementCard
              key={b._id}
              bill={b}
              onCollectOrPay={onOpenPay}
            />
          ))
        ) : (
          <div className="card empty-state">
            <p>{t('accountHolderDetail.noBillsYet')}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onAddStatement}>
              + {t('accountHolderDetail.addBill')}
            </button>
          </div>
        )}
      </div>

      <details className="card contact-collapsible">
        <summary>{t('accountHolderDetail.contactSection')}</summary>
        <div className="detail-grid" style={{ padding: '0 16px 16px' }}>
          {h.bankName && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.bankName')}</div>
              <div className="detail-value">{h.bankName}</div>
            </div>
          )}
          {h.bankAccountName && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.accountName')}</div>
              <div className="detail-value">{h.bankAccountName}</div>
            </div>
          )}
          {h.bankAccountNumber && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.accountNumber')}</div>
              <div className="detail-value">{h.bankAccountNumber}</div>
            </div>
          )}
          {h.phone && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.phone')}</div>
              <div className="detail-value">
                <a href={`tel:${h.phone}`} style={{ color: 'var(--accent)' }}>
                  {h.phone}
                </a>
              </div>
            </div>
          )}
          {h.email && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.email')}</div>
              <div className="detail-value">{h.email}</div>
            </div>
          )}
          {h.address && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.address')}</div>
              <div className="detail-value">{h.address}</div>
            </div>
          )}
          {h.notes && (
            <div className="detail-item">
              <div className="detail-label">{t('accountHolders.notes')}</div>
              <div className="detail-value">{h.notes}</div>
            </div>
          )}
        </div>
      </details>
    </>
  );
}
