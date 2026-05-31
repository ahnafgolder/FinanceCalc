'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clearAllCache } from '@/lib/fetchCache';

function SignInForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const wasReset = searchParams.get('reset') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    if (res?.error) {
      if (res.error === 'AccountFrozen') {
        setError('Your account has been frozen. Please contact your administrator.');
      } else {
        setError(res.error);
      }
      setLoading(false);
    } else {
      clearAllCache();
      router.push('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent), #d97706)',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#0a0e1a'
          }}>FC</div>
        </div>
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your FinanceCalc account</p>

        {wasReset && <div className="auth-success">Password has been reset successfully. Please sign in with your new password.</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Forgot password? <span style={{ color: 'var(--accent)' }}>Contact your admin</span>
            </p>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/auth/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="subtitle">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}

