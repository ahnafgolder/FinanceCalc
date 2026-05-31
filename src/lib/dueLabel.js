/** Shared due-date labels for dashboard and holder pages. */
export function dueLabel(dueDate, t, fmtDate) {
  if (!dueDate) return '—';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} ${t('dashboard.daysOverdue')}`;
  if (diff === 0) return t('dashboard.dueToday');
  if (diff === 1) return t('dashboard.dueTomorrow');
  return fmtDate(dueDate);
}
