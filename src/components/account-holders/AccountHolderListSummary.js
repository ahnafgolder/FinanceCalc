'use client';

import { useLanguage } from '@/components/LanguageContext';

export default function AccountHolderListSummary({ summary }) {
  const { t, fmt } = useLanguage();
  if (!summary) return null;

  return (
    <div className="stats-grid holder-summary-bar">
      <div className="stat-card info">
        <div className="stat-label">{t('accountHolders.summaryOwesMe')}</div>
        <div className="stat-value" style={{ color: 'var(--info)' }}>{fmt(summary.totalOwesMe)}</div>
      </div>
      <div className="stat-card accent">
        <div className="stat-label">{t('accountHolders.summaryIOwe')}</div>
        <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(summary.totalIOwe)}</div>
      </div>
      <div className="stat-card danger">
        <div className="stat-label">{t('accountHolders.summaryOverdue')}</div>
        <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.overduePeople}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">{t('accountHolders.summaryTotalPeople')}</div>
        <div className="stat-value">{summary.totalPeople}</div>
      </div>
    </div>
  );
}
