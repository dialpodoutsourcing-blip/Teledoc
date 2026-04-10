import React, { useState } from 'react';

export default function AppointmentModal({ doctor, onBook, onClose }) {
  const [form, setForm] = useState({
    scheduledAt: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt) return;
    setLoading(true);
    try {
      await onBook(form);
    } finally {
      setLoading(false);
    }
  };

  // Get min datetime (now + 1 hour)
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📅 Book Appointment</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Doctor info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)', marginBottom: 24,
          border: '1px solid var(--border)'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff'
          }}>
            {doctor.firstName?.[0]}{doctor.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Dr. {doctor.firstName} {doctor.lastName}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{doctor.specialization || 'General Physician'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Preferred Date & Time <span className="form-required">*</span></label>
            <input
              id="appt-datetime"
              className="form-input"
              type="datetime-local"
              name="scheduledAt"
              value={form.scheduledAt}
              onChange={handle}
              min={minDateTime}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Visit</label>
            <textarea
              id="appt-reason"
              className="form-textarea"
              name="reason"
              placeholder="Brief description of your concern..."
              value={form.reason}
              onChange={handle}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="appt-submit" type="submit" className="btn btn-primary" disabled={loading || !form.scheduledAt}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Booking...</> : '📅 Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
