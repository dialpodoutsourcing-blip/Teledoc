'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const [role, setRole] = useState('PATIENT');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    specialization: '',
    licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handle = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await signUp({
        email: form.email,
        password: form.password,
        metadata: {
          role,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth || null,
          specialization: form.specialization,
          licenseNumber: form.licenseNumber,
        },
      });

      if (result.session) {
        router.push(role === 'DOCTOR' ? '/doctor' : '/patient');
      } else {
        router.push('/login?registered=1');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '560px' }}>
        <div className="auth-logo">
          <div className="logo-icon">M</div>
          <span className="logo-text">MediConnect</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join the telemedicine platform</p>

        <div className="role-tabs" style={{ marginBottom: '20px' }}>
          <button
            id="role-patient"
            className={`role-tab ${role === 'PATIENT' ? 'active' : ''}`}
            onClick={() => setRole('PATIENT')}
            type="button"
          >
            Patient
          </button>
          <button
            id="role-doctor"
            className={`role-tab ${role === 'DOCTOR' ? 'active' : ''}`}
            onClick={() => setRole('DOCTOR')}
            type="button"
          >
            Doctor
          </button>
        </div>

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
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: 'var(--success-dim)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              color: 'var(--success)',
              fontSize: '13px',
            }}
          >
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                First Name<span className="form-required">*</span>
              </label>
              <input
                id="reg-firstname"
                className="form-input"
                name="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={handle}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Last Name<span className="form-required">*</span>
              </label>
              <input
                id="reg-lastname"
                className="form-input"
                name="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={handle}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Email<span className="form-required">*</span>
            </label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Password<span className="form-required">*</span>
            </label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              id="reg-phone"
              className="form-input"
              name="phone"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={handle}
            />
          </div>

          {role === 'PATIENT' && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  id="reg-dob"
                  className="form-input"
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handle}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select id="reg-gender" className="form-select" name="gender" value={form.gender} onChange={handle}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {role === 'DOCTOR' && (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  id="reg-spec"
                  className="form-input"
                  name="specialization"
                  placeholder="e.g. Cardiology"
                  value={form.specialization}
                  onChange={handle}
                />
              </div>
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input
                  id="reg-license"
                  className="form-input"
                  name="licenseNumber"
                  placeholder="MD-12345"
                  value={form.licenseNumber}
                  onChange={handle}
                />
              </div>
            </div>
          )}

          <button
            id="reg-submit"
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
