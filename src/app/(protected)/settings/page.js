'use client';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageContext';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordsDoNotMatch') });
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort') });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.passwordChangedSuccess') });
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: t('accountHolders.failedDelete') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{t('sidebar.settings')}</h2>
          <p>{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card settings-section">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👤</span> {t('settings.profileInfo')}
        </h3>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">{t('accountHolders.name')}</div>
            <div className="detail-value">{session?.user?.name || '—'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">{t('accountHolders.email')}</div>
            <div className="detail-value">{session?.user?.email || '—'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">{t('settings.role')}</div>
            <div className="detail-value">
              <span className={`badge ${session?.user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                {session?.user?.role === 'admin' ? `🛡️ ${t('settings.roleAdmin')}` : `👤 ${t('settings.roleUser')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card settings-section" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔒</span> {t('settings.changePassword')}
        </h3>

        {message.text && (
          <div className={message.type === 'error' ? 'auth-error' : 'auth-success'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
          <div className="form-group">
            <label>{t('settings.currentPassword')}</label>
            <input
              type="password"
              className="form-control"
              placeholder={t('settings.currentPassPlaceholder')}
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('settings.newPassword')}</label>
            <input
              type="password"
              className="form-control"
              placeholder={t('settings.newPassPlaceholder')}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
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
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('common.saving') : t('settings.updatePasswordBtn')}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🚪</span> {t('sidebar.signOut')}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('settings.signOutDesc') || 'Sign out of your account on this device.'}
        </p>
        <button
          className="btn btn-danger"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          🚪 {t('sidebar.signOut')}
        </button>
      </div>
    </div>
  );
}

