'use client';

import { useLanguage } from '@/components/LanguageContext';

const FILTERS = ['all', 'owesMe', 'iOwe', 'settled', 'overdue'];
const SORTS = ['balance', 'name', 'activity', 'due'];

export default function AccountHolderFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
}) {
  const { t } = useLanguage();

  return (
    <div className="holder-filters">
      <input
        className="form-control"
        placeholder={`🔍 ${t('dashboard.searchPeople')}`}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filter-chips">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {t(`accountHolders.filter_${f}`)}
          </button>
        ))}
      </div>
      <select
        className="form-control holder-sort-select"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`accountHolders.sort_${s}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
