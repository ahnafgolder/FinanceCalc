'use client';

import { useMemo, useState } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/components/LanguageContext';
import AccountHolderListSummary from '@/components/account-holders/AccountHolderListSummary';
import AccountHolderFilters from '@/components/account-holders/AccountHolderFilters';
import AccountHolderRow from '@/components/account-holders/AccountHolderRow';
import {
  computeListSummary,
  filterHolders,
  searchHolders,
  sortHolders,
} from '@/lib/holderListUtils';
import { apiFetch } from '@/lib/api';

export default function AccountHolders() {
  const { data: holders, isLoading, refetch } = useCachedQuery('/api/account-holders');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('balance');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'client',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const summary = useMemo(() => computeListSummary(holders), [holders]);

  const filtered = useMemo(() => {
    const searched = searchHolders(holders, search);
    const filteredList = filterHolders(searched, filter);
    return sortHolders(filteredList, sortBy);
  }, [holders, search, filter, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/api/account-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setSaving(false);
        return;
      }
      setShowModal(false);
      setForm({
        name: '',
        type: 'client',
        bankAccountName: '',
        bankAccountNumber: '',
        bankName: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
      refetch();
    } catch {
      setError(t('accountHolders.failedDelete'));
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{t('accountHolders.title')}</h2>
          <p>{t('accountHolders.subtitle')}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}>
          {t('accountHolders.newHolder')}
        </button>
      </div>

      <AccountHolderListSummary summary={summary} />

      <AccountHolderFilters
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {filtered.length > 0 ? (
        <div className="action-list">
          {filtered.map((h) => (
            <AccountHolderRow key={h._id} holder={h} />
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">👥</div>
          <h3>{search || filter !== 'all' ? t('users.noUsersFound') : t('accountHolders.noHolders')}</h3>
          <p>
            {search || filter !== 'all'
              ? t('users.noUsersFoundDesc')
              : t('accountHolders.noHoldersSub')}
          </p>
          {!search && filter === 'all' && (
            <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}>
              {t('accountHolders.createHolder')}
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal">
            <h3>{t('accountHolders.newHolderTitle')}</h3>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('accountHolders.name')} *</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.phone')}</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('common.type')}</label>
                  <select
                    className="form-control"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="client">{t('accountHolders.client')}</option>
                    <option value="vendor">{t('accountHolders.vendor')}</option>
                    <option value="both">{t('accountHolders.both')}</option>
                  </select>
                  <p className="form-hint">
                    {form.type === 'client'
                      ? t('accountHolders.typeHintClient')
                      : form.type === 'vendor'
                        ? t('accountHolders.typeHintVendor')
                        : t('accountHolders.typeHintBoth')}
                  </p>
                </div>
                <div className="form-group">
                  <label>{t('accountHolders.bankName')}</label>
                  <input
                    className="form-control"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t('accountHolders.notes')}</label>
                <textarea
                  className="form-control"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('common.saving') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
