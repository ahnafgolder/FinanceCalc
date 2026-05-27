'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resetModal, setResetModal] = useState(null);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
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
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          setResetModal(null);
          setResetForm({ newPassword: '', confirmPassword: '' });
          setMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setResetLoading(false);
    }
  };

  const closeModal = () => {
    setResetModal(null);
    setResetForm({ newPassword: '', confirmPassword: '' });
    setMessage({ type: '', text: '' });
  };

  const [togglingId, setTogglingId] = useState(null);

  const handleToggleStatus = async (user) => {
    console.log("handleToggleStatus called for user:", user.email, "user._id:", user._id, "session.user.id:", session?.user?.id);
    if (session?.user?.id === user._id || togglingId) {
      console.log("handleToggleStatus aborted: isSelf?", session?.user?.id === user._id, "togglingId:", togglingId);
      return;
    }

    setTogglingId(user._id);
    try {
      console.log("Sending POST to /api/admin/users/" + user._id + "/toggle-status");
      const res = await fetch(`/api/admin/users/${user._id}/toggle-status`, {
        method: 'POST',
      });
      const data = await res.json();
      console.log("Response from toggle-status API:", res.status, data);
      if (res.ok) {
        await fetchUsers();
      } else {
        alert(data.error || 'Failed to change user status');
      }
    } catch (err) {
      console.error("Error in handleToggleStatus:", err);
      alert('Something went wrong');
    } finally {
      setTogglingId(null);
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <div className="access-denied-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page. Contact your administrator.</p>
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
          <h2>User Management</h2>
          <p>View and manage all registered users</p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card accent">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Admins</div>
          <div className="stat-value">{users.filter((u) => u.role === 'admin').length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Regular Users</div>
          <div className="stat-value">{users.filter((u) => u.role !== 'admin').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar">
          <input
            type="text"
            className="form-control"
            placeholder="🔍  Search by name or email..."
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
            <h3>No Users Found</h3>
            <p>No users match your search criteria.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                        {user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'frozen' ? 'badge-unpaid' : 'badge-paid'}`}>
                        {user.status === 'frozen' ? '❄️ Frozen' : '✅ Active'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setResetModal(user)}
                          title="Reset Password"
                        >
                          🔑 Reset
                        </button>
                        <button
                          className={`btn btn-sm ${user.status === 'frozen' ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => handleToggleStatus(user)}
                          disabled={session?.user?.id === user._id || togglingId === user._id}
                          title={user.status === 'frozen' ? 'Activate Account' : 'Freeze Account'}
                        >
                          {togglingId === user._id ? '...' : user.status === 'frozen' ? '🔥 Activate' : '❄️ Freeze'}
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
            <h3>Reset Password</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-16px', marginBottom: '24px', fontSize: '14px' }}>
              Set a new password for <strong style={{ color: 'var(--text-primary)' }}>{resetModal.name}</strong>{' '}
              <span style={{ color: 'var(--text-muted)' }}>({resetModal.email})</span>
            </p>

            {message.text && (
              <div className={message.type === 'error' ? 'auth-error' : 'auth-success'}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
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
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
