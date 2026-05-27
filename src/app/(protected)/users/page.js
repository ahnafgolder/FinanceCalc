'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageContext';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resetModal, setResetModal] = useState(null);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [togglingId, setTogglingId] = useState(null);
  const { t, fmtDate } = useLanguage();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // ignore
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordsDoNotMatch') });
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort') });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${resetModal._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: t('users.resetSuccess') });
        setTimeout(() => {
          setResetModal(null);
          setResetForm({ newPassword: '', confirmPassword: '' });
          setMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: t('accountHolders.failedDelete') });
    } finally {
      setResetLoading(false);
    }
  };

  const closeModal = () => {
    setResetModal(null);
    setResetForm({ newPassword: '', confirmPassword: '' });
    setMessage({ type: '', text: '' });
  };

  const handleToggleStatus = async (user) => {
    if (session?.user?.id === user._id || togglingId) return;

    setTogglingId(user._id);
    try {
      const res = await fetch(`/api/admin/users/${user._id}/toggle-status`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        await fetchUsers();
      } else {
        alert(data.error || t('users.failedToggle'));
      }
    } catch {
      alert(t('accountHolders.failedDelete'));
    } finally {
      setTogglingId(null);
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <div className="access-denied-icon">🔒</div>
        <h2>{t('users.accessDenied')}</h2>
        <p>{t('users.accessDeniedDesc')}</p>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{t('users.title')}</h2>
          <p>{t('users.subtitle')}</p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card accent">
          <div className="stat-label">{t('users.totalUsers')}</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">{t('users.admins')}</div>
          <div className="stat-value">{users.filter((u) => u.role === 'admin').length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">{t('users.regularUsers')}</div>
          <div className="stat-value">{users.filter((u) => u.role !== 'admin').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar">
          <input
            type="text"
            className="form-control"
            placeholder={`🔍  ${t('users.searchPlaceholder')}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '280px' }}
          />
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{t('users.noUsersFound')}</h3>
            <p>{t('users.noUsersFoundDesc')}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('users.user')}</th>
                  <th>{t('accountHolders.email')}</th>
                  <th>{t('settings.role')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('users.joined')}</th>
                  <th style={{ textAlign: 'right' }}>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: user.role === 'admin'
                              ? 'linear-gradient(135deg, var(--info), #2563eb)'
                              : 'linear-gradient(135deg, var(--accent), #d97706)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {user.role === 'admin' ? `🛡️ ${t('settings.roleAdmin')}` : `👤 ${t('settings.roleUser')}`}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'frozen' ? 'badge-unpaid' : 'badge-paid'}`}>
                        {user.status === 'frozen' ? `❄️ ${t('users.frozen')}` : `✅ ${t('users.active')}`}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {fmtDate(user.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setResetModal(user)}
                          title={t('users.resetPassword')}
                        >
                          🔑 {t('users.reset')}
                        </button>
                        <button
                          className={`btn btn-sm ${user.status === 'frozen' ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={session?.user?.id === user._id || togglingId === user._id}
                          title={user.status === 'frozen' ? t('users.activate') : t('users.freeze')}
                        >
                          {togglingId === user._id ? '...' : user.status === 'frozen' ? `🔥 ${t('users.activate')}` : `❄️ ${t('users.freeze')}`}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('users.resetPassword')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-16px', marginBottom: '24px', fontSize: '14px' }}>
              {t('users.resetPasswordFor')} <strong style={{ color: 'var(--text-primary)' }}>{resetModal.name}</strong>{' '}
              <span style={{ color: 'var(--text-muted)' }}>({resetModal.email})</span>
            </p>

            {message.text && (
              <div className={message.type === 'error' ? 'auth-error' : 'auth-success'}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>{t('settings.newPassword')}</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder={t('settings.newPassPlaceholder')}
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>{t('settings.confirmPassword')}</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? t('common.saving') : t('users.resetPasswordBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
