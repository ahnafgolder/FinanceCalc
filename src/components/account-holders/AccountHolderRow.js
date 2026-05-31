'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import { getHolderBalanceView } from '@/lib/holderListUtils';
import { dueLabel } from '@/lib/dueLabel';

export default function AccountHolderRow({ holder }) {
  const router = useRouter();
  const { t, fmt, fmtDate } = useLanguage();
  const { amount, direction } = getHolderBalanceView(holder);

  const typeLabel =
    holder.type === 'vendor'
      ? t('accountHolders.vendor')
      : holder.type === 'client'
        ? t('accountHolders.client')
        : t('accountHolders.both');

  const typeHint =
    holder.type === 'vendor'
      ? t('accountHolders.typeHintVendor')
      : holder.type === 'client'
        ? t('accountHolders.typeHintClient')
        : t('accountHolders.typeHintBoth');

  const balanceLabel =
    direction === 'owesMe'
      ? t('dashboard.theyOweYou')
      : direction === 'iOwe'
        ? t('dashboard.youOweThem')
        : t('dashboard.settled');

  const initial = holder.name?.charAt(0)?.toUpperCase() || '?';
  const isOverdue = (holder.overdueCount || 0) > 0;

  const goDetail = () => router.push(`/account-holders/${holder._id}`);
  const stop = (e) => e.stopPropagation();

  const quickPayAction = direction === 'iOwe' ? 'pay' : 'collect';

  return (
    <div
      className={`action-row holder-row ${isOverdue ? 'overdue' : ''}`}
      onClick={goDetail}
    >
      <div className="holder-row-main">
        <div className="holder-avatar">{initial}</div>
        <div>
          <div className="action-row-name">{holder.name}</div>
          <div className="action-row-sub">
            <span className="badge badge-muted">{typeLabel}</span>
            <span className="holder-type-hint">{typeHint}</span>
          </div>
          <div className="action-row-sub" style={{ marginTop: '4px' }}>
            {holder.phone && <span>{holder.phone}</span>}
            {isOverdue && (
              <span className="overdue-chip">
                {holder.overdueCount} {t('accountHolders.overdueStatements')}
              </span>
            )}
            {holder.nextDueDate && !isOverdue && (
              <span>
                {t('accountHolders.nextDue')}: {dueLabel(holder.nextDueDate, t, fmtDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="holder-row-end">
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <div
            className={`action-row-amount ${
              direction === 'owesMe' ? 'collect' : direction === 'iOwe' ? 'pay' : 'positive'
            }`}
          >
            {direction === 'settled' ? t('dashboard.settled') : fmt(amount)}
          </div>
          {direction !== 'settled' && (
            <div className="action-row-sub">{balanceLabel}</div>
          )}
        </div>
        <div className="holder-quick-actions" onClick={stop}>
          {holder.phone && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              title={t('dashboard.call')}
              onClick={() => {
                window.location.href = `tel:${holder.phone.replace(/\s/g, '')}`;
              }}
            >
              📞
            </button>
          )}
          {direction !== 'settled' && (holder.openStatementCount || 0) > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                router.push(`/account-holders/${holder._id}?action=${quickPayAction}`)
              }
            >
              {direction === 'owesMe' ? t('dashboard.collect') : t('dashboard.pay')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
