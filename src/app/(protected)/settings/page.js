'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
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
        setMessage({ type: 'success', text: data.message });
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your account preferences</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card settings-section">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>👤</span> Profile Information
        </h3>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">Name</div>
            <div className="detail-value">{session?.user?.name || '—'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Email</div>
            <div className="detail-value">{session?.user?.email || '—'}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Role</div>
            <div className="detail-value">
              <span className={`badge ${session?.user?.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                {session?.user?.role === 'admin' ? '🛡️ Admin' : '👤 User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card settings-section" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔒</span> Change Password
        </h3>

        {message.text && (
          <div className={message.type === 'error' ? 'auth-error' : 'auth-success'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your current password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Min 6 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
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
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
