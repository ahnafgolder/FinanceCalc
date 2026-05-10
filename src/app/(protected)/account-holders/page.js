'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountHolders() {
  const router = useRouter();
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'vendor', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => fetch('/api/account-holders').then(r => r.json()).then(d => { setHolders(d); setLoading(false); });
  useEffect(() => { fetchData(); }, []);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(n || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/account-holders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setShowModal(false);
      setForm({ name: '', type: 'vendor', bankAccountName: '', bankAccountNumber: '', bankName: '', phone: '', email: '', address: '', notes: '' });
      fetchData();
    } catch { setError('Something went wrong'); }
    setSaving(false);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <div><h2>Account Holders</h2><p>Manage your vendors, clients, and contacts</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Account Holder</button>
      </div>

      {holders.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Bank</th><th>Total Billed</th><th>Collected</th><th>Paid Out</th><th>Outstanding</th></tr></thead>
              <tbody>
                {holders.map(h => (
                  <tr key={h._id} onClick={() => router.push(`/account-holders/${h._id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{h.name}</td>
                    <td><span className={`badge badge-${h.type}`}>{h.type}</span></td>
                    <td>{h.bankName || '—'}</td>
                    <td>{fmt(h.totalBilled)}</td>
                    <td style={{ color: 'var(--success)' }}>{fmt(h.totalCollected)}</td>
                    <td style={{ color: 'var(--danger)' }}>{fmt(h.totalPaidOut)}</td>
                    <td style={{ color: (h.outstandingReceivable > 0 || h.outstandingPayable > 0) ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {h.type === 'client' ? fmt(h.outstandingReceivable) : (h.type === 'vendor' ? fmt(h.outstandingPayable) : fmt(h.outstandingReceivable + h.outstandingPayable))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Account Holders Yet</h3>
          <p>Create your first account holder to start tracking bills and payments</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Account Holder</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <h3>New Account Holder</h3>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Type</label><select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="vendor">Vendor</option><option value="client">Client</option><option value="both">Both</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Bank Name</label><input className="form-control" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
                <div className="form-group"><label>Account Name</label><input className="form-control" value={form.bankAccountName} onChange={e => setForm({...form, bankAccountName: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Account Number</label><input className="form-control" value={form.bankAccountNumber} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} /></div>
                <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label>Address</label><input className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
