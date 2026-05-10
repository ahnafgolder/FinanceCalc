'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NewBill() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedHolder = searchParams.get('holder') || '';

  const [holders, setHolders] = useState([]);
  const [form, setForm] = useState({ accountHolderId: preselectedHolder, type: 'receivable', description: '', totalAmount: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedHolder = holders.find(h => h._id === form.accountHolderId);

  useEffect(() => {
    if (selectedHolder) {
      if (selectedHolder.type === 'client') setForm(f => ({ ...f, type: 'receivable' }));
      else if (selectedHolder.type === 'vendor') setForm(f => ({ ...f, type: 'payable' }));
    }
  }, [selectedHolder]);

  useEffect(() => { fetch('/api/account-holders').then(r => r.json()).then(setHolders); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalAmount: parseFloat(form.totalAmount), dueDate: form.dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      router.push(`/bills/${data._id}`);
    } catch { setError('Something went wrong'); setSaving(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/bills" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>← Back to Bills</Link>
          <h2 style={{ marginTop: '8px' }}>Create New Bill</h2>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Account Holder *</label>
            <select className="form-control" value={form.accountHolderId} onChange={e => setForm({...form, accountHolderId: e.target.value})} required>
              <option value="">Select account holder</option>
              {holders.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>
          {selectedHolder && (
            <div className="form-group">
              <label>Bill Type *</label>
              {selectedHolder.type === 'both' ? (
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})} required>
                  <option value="receivable">Collecting Money (Receivable)</option>
                  <option value="payable">Giving Money (Payable)</option>
                </select>
              ) : (
                <input className="form-control" value={form.type === 'receivable' ? 'Collecting Money (Receivable)' : 'Giving Money (Payable)'} disabled />
              )}
            </div>
          )}
          <div className="form-group">
            <label>Description</label>
            <input className="form-control" placeholder="What is this bill for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount *</label>
              <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input className="form-control" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link href="/bills" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Bill'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
