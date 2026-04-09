import React from 'react';

export default function PatientProfile({ patient }) {
  if (!patient) return null;

  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      {/* Header */}
      <div className="profile-section" style={{ background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>
            {patient.firstName?.[0]}{patient.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{patient.firstName} {patient.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {age ? `${age} yrs · ` : ''}{patient.gender || 'Unknown gender'}
            </div>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="profile-section">
        <div className="profile-section-title">🩺 Quick Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Blood Type', value: patient.bloodType || '—', color: 'var(--danger)' },
            { label: 'Age', value: age ? `${age} years` : '—' },
            { label: 'Phone', value: patient.phone || '—' },
            { label: 'Gender', value: patient.gender || '—' },
          ].map(f => (
            <div key={f.label} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              padding: '10px 12px', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: f.color || 'var(--text-primary)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical History */}
      <div className="profile-section">
        <div className="profile-section-title">📋 Medical History</div>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          padding: '12px', border: '1px solid var(--border)',
          fontSize: 13, color: patient.medicalHistory ? 'var(--text-primary)' : 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          {patient.medicalHistory || 'No medical history on record.'}
        </div>
      </div>

      {/* Allergies */}
      <div className="profile-section">
        <div className="profile-section-title">⚠️ Allergies</div>
        {patient.allergies ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {patient.allergies.split(',').map((a, i) => (
              <span key={i} style={{
                background: 'var(--danger-dim)', color: 'var(--danger)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontSize: 12, fontWeight: 600
              }}>
                {a.trim()}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No known allergies</div>
        )}
      </div>

      {/* Current Medications */}
      <div className="profile-section">
        <div className="profile-section-title">💊 Current Medications</div>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          padding: '12px', border: '1px solid var(--border)',
          fontSize: 13, color: patient.medications ? 'var(--text-primary)' : 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          {patient.medications || 'No current medications.'}
        </div>
      </div>

      {/* Past Consultations */}
      {patient.medicalRecords?.length > 0 && (
        <div className="profile-section">
          <div className="profile-section-title">🗂️ Past Diagnoses</div>
          {patient.medicalRecords.slice(0, 4).map(rec => (
            <div key={rec.id} className="history-item">
              <div className="history-date">{new Date(rec.createdAt).toLocaleDateString()}</div>
              <div className="history-diagnosis">{rec.consultation?.diagnosis || rec.title}</div>
              {rec.summary && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>{rec.summary}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
