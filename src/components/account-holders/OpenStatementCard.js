'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import { dueLabel } from '@/lib/dueLabel';

export default function OpenStatementCard({ bill, onCollectOrPay }) {
  const { t, fmt, fmtDate } = useLanguage();
  const router = useRouter();

  const remaining = bill.remaining ?? bill.totalAmount;
  const paid = bill.totalPaid ?? 0;
  const pct = bill.totalAmount > 0 ? Math.min((paid / bill.totalAmount) * 100, 100) : 0;
  const isOverdue =
    bill.dueDate &&
    bill.status !== 'paid' &&
    new Date(bill.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const isCollect = bill.type === 'receivable';
  const actionLabel = isCollect ? t('dashboard.collect') : t('dashboard.pay');

  return (
    <div className={`open-statement-card ${isOverdue ? 'overdue' : ''}`}>
      <div className="open-statement-header">
        <div>
          <div
            className="open-statement-title"
            style={{ cursor: 'pointer', color: 'var(--accent)' }}
            onClick={() => router.push(`/bills/${bill._id}`)}
          >
            {bill.billNumber}
            {bill.category === 'loan' && (
              <span className="badge badge-loan" style={{ marginLeft: '8px' }}>
                {t('loan.badge')}
              </span>
            )}
          </div>
          {bill.description && (
            <div className="open-statement-meta">{bill.description}</div>
          )}
          <div className="open-statement-meta">
            {t('accountHolderDetail.remaining')}: {fmt(remaining)}
            {bill.dueDate && (
              <> · {dueLabel(bill.dueDate, t, fmtDate)}</>
            )}
          </div>
        </div>
        <span className={`badge badge-${bill.status}`}>
          {bill.status === 'paid'
            ? t('accountHolderDetail.statusPaid')
            : bill.status === 'partial'
              ? t('accountHolderDetail.statusPartial')
              : t('accountHolderDetail.statusUnpaid')}
        </span>
      </div>
      {bill.totalAmount > 0 && (
        <>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="open-statement-meta">
            {t('accountHolderDetail.paidProgress')}: {fmt(paid)} / {fmt(bill.totalAmount)}
          </div>
        </>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        style={{
          marginTop: '12px',
          width: '100%',
          background: isCollect
            ? 'linear-gradient(135deg, var(--success), #059669)'
            : undefined,
        }}
        onClick={() => onCollectOrPay(bill._id)}
      >
        {isCollect ? `💰 ${actionLabel}` : `💸 ${actionLabel}`}
      </button>
    </div>
  );
}
