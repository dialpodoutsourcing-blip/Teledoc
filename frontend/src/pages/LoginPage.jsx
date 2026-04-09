import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const demoAccounts = [
  {
    label: 'Doctor',
    email: 'doctor@demo.com',
    password: 'demo123',
    cta: 'Use Doctor Demo',
  },
  {
    label: 'Patient',
    email: 'patient@demo.com',
    password: 'demo123',
    cta: 'Use Patient Demo',
  },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDemoFill = (account) => setForm({ email: account.email, password: account.password });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === 'DOCTOR' ? '/doctor' : '/patient');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">M</div>
          <span className="logo-text">MediConnect</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your telemedicine account</p>

        {error && (
          <div
            style={{
              background: 'var(--danger-dim)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              color: 'var(--danger)',
              fontSize: '13px',
            }}
          >
            Error: {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register">Create account</Link>
        </div>

        <div className="demo-credentials">
          <div className="demo-credentials-header">
            <h2 className="demo-credentials-title">Demo Credentials</h2>
            <p className="demo-credentials-subtitle">
              Use either seeded account to explore the doctor and patient flows.
            </p>
          </div>

          <div className="demo-credential-list">
            {demoAccounts.map((account) => (
              <div key={account.label} className="demo-credential-item">
                <div className="demo-credential-meta">
                  <div className="demo-credential-label">{account.label}</div>
                  <div className="demo-credential-copy">{account.email}</div>
                  <div className="demo-credential-copy">{account.password}</div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm demo-credential-action"
                  onClick={() => handleDemoFill(account)}
                >
                  {account.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
