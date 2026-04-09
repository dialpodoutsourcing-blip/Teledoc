import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  getPatientProfile, updatePatientProfile, getDoctors,
  bookAppointment, getAppointments, getPatientHistory
} from '../services/api';
import AppointmentModal from '../components/AppointmentModal';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const { socket, onlineDoctors } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(null);
  const [nudgeStatus, setNudgeStatus] = useState('');
  const [showApptModal, setShowApptModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([getPatientProfile(), getDoctors(), getAppointments(), getPatientHistory()])
      .then(([p, d, a, h]) => {
        setProfile(p.data);
        setProfileForm(p.data);
        setDoctors(d.data);
        setAppointments(a.data);
        setHistory(h.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('nudge_accepted', ({ roomId, consultationId }) => {
      setNudging(null);
      setNudgeStatus('');
      showToast('Doctor accepted! Joining call...', 'success');
      setTimeout(() => navigate(`/consultation/${roomId}`), 1000);
    });

    socket.on('nudge_rejected', () => {
      setNudging(null);
      setNudgeStatus('');
      showToast('Doctor is unavailable right now.', 'error');
    });

    socket.on('nudge_failed', ({ message }) => {
      setNudging(null);
      setNudgeStatus('');
      showToast(message, 'error');
    });

    return () => {
      socket.off('nudge_accepted');
      socket.off('nudge_rejected');
      socket.off('nudge_failed');
    };
  }, [socket, navigate]);

  const handleNudge = async (doctor) => {
    if (!socket) return;
    setNudging(doctor);
    setNudgeStatus('Sending request...');

    // create a nudge appointment first
    try {
      const apptRes = await bookAppointment({
        doctorId: doctor.id,
        scheduledAt: new Date().toISOString(),
        reason: 'Instant consultation request',
        type: 'NUDGE',
      });

      socket.emit('nudge_doctor', {
        doctorProfileId: doctor.id,
        patientProfileId: profile.id,
        patientName: `${profile.firstName} ${profile.lastName}`,
        appointmentId: apptRes.data.id,
        reason: 'Instant consultation',
      });
      setNudgeStatus('Waiting for doctor to accept...');
    } catch (err) {
      setNudging(null);
      showToast('Failed to send request', 'error');
    }
  };

  const handleBookAppointment = async (data) => {
    try {
      await bookAppointment({ ...data, doctorId: selectedDoctor.id, type: 'SCHEDULED' });
      const res = await getAppointments();
      setAppointments(res.data);
      setShowApptModal(false);
      showToast('Appointment booked!', 'success');
    } catch (err) {
      showToast('Failed to book appointment', 'error');
    }
  };

  const handleProfileSave = async () => {
    try {
      const res = await updatePatientProfile(profileForm);
      setProfile(res.data);
      setProfileEdit(false);
      showToast('Profile updated!', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    }
  };

  const isOnline = (doctorId) => onlineDoctors.includes(doctorId);

  const apptStatusClass = (s) => {
    if (s === 'ACCEPTED') return 'badge-success';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-danger';
    if (s === 'COMPLETED') return 'badge-muted';
    return 'badge-warning';
  };

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Loading your dashboard...</span>
    </div>
  );

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">M</div>
            <span className="logo-text">MediConnect</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Patient Portal</div>
          {[
            { id: 'overview', icon: '🏠', label: 'Overview' },
            { id: 'doctors', icon: '👨‍⚕️', label: 'Find Doctors' },
            { id: 'appointments', icon: '📅', label: 'Appointments' },
            { id: 'history', icon: '📋', label: 'Medical History' },
            { id: 'profile', icon: '👤', label: 'My Profile' },
          ].map((item) => (
            <button key={item.id} id={`nav-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill" onClick={logout} title="Logout">
            <div className="user-avatar">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</div>
            <div className="user-info">
              <div className="user-name">{profile?.firstName} {profile?.lastName}</div>
              <div className="user-role">Patient · Logout →</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="main-content">
        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Good day, {profile?.firstName} 👋</div>
                <div className="page-subtitle">Here's your health overview</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Appointments</div>
                <div className="stat-value">{appointments.length}</div>
                <div className="stat-desc">Total booked</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{appointments.filter(a => a.status === 'ACCEPTED').length}</div>
                <div className="stat-desc">Confirmed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Consultations</div>
                <div className="stat-value">{history.length}</div>
                <div className="stat-desc">Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Online Doctors</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{onlineDoctors.length}</div>
                <div className="stat-desc">Available now</div>
              </div>
            </div>

            <div className="dashboard-body">
              {onlineDoctors.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <div className="section-header">
                    <div className="section-title">⚡ Available Now — Instant Consultation</div>
                  </div>
                  <div className="doctor-grid">
                    {doctors.filter(d => isOnline(d.id)).map(doc => (
                      <div key={doc.id} className="doctor-card online">
                        <div className="doctor-avatar-lg">{doc.firstName[0]}{doc.lastName[0]}</div>
                        <div className="doctor-name">Dr. {doc.firstName} {doc.lastName}</div>
                        <div className="doctor-spec">{doc.specialization || 'General Physician'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <span className="online-dot" />
                          <span style={{ fontSize: 12, color: 'var(--success)' }}>Online</span>
                        </div>
                        <button id={`nudge-${doc.id}`} className="btn btn-success w-full btn-sm" onClick={() => handleNudge(doc)}>
                          ⚡ Nudge Doctor
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="section-header">
                <div className="section-title">Recent Appointments</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('appointments')}>View all →</button>
              </div>
              {appointments.slice(0, 4).map(appt => (
                <div key={appt.id} className="appt-item">
                  <div className="appt-info">
                    <div className="appt-doctor">Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}</div>
                    <div className="appt-meta">{appt.doctor?.specialization} · {new Date(appt.scheduledAt).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${apptStatusClass(appt.status)}`}>{appt.status}</span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">No appointments yet</div>
                  <div className="empty-state-desc">Find a doctor and book your first appointment</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Find Doctors ── */}
        {activeTab === 'doctors' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Find a Doctor</div>
                <div className="page-subtitle">Browse available doctors and request a consultation</div>
              </div>
            </div>
            <div className="dashboard-body">
              <div className="doctor-grid">
                {doctors.map(doc => {
                  const online = isOnline(doc.id);
                  return (
                    <div key={doc.id} className={`doctor-card ${online ? 'online' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div className="doctor-avatar-lg">{doc.firstName[0]}{doc.lastName[0]}</div>
                        {online
                          ? <span className="badge badge-success"><span className="online-dot" style={{ width: 6, height: 6 }} /> Online</span>
                          : <span className="badge badge-muted">Offline</span>
                        }
                      </div>
                      <div className="doctor-name">Dr. {doc.firstName} {doc.lastName}</div>
                      <div className="doctor-spec">{doc.specialization || 'General Physician'}</div>
                      {doc.bio && <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>{doc.bio}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {online && (
                          <button id={`nudge-dr-${doc.id}`} className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleNudge(doc)}>
                            ⚡ Nudge
                          </button>
                        )}
                        <button id={`book-dr-${doc.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedDoctor(doc); setShowApptModal(true); }}>
                          📅 Schedule
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {doctors.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">👨‍⚕️</div>
                  <div className="empty-state-title">No doctors yet</div>
                  <div className="empty-state-desc">Doctors will appear here once registered</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Appointments ── */}
        {activeTab === 'appointments' && (
          <>
            <div className="page-header">
              <div className="page-title">My Appointments</div>
            </div>
            <div className="dashboard-body">
              {appointments.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th><th>Specialization</th><th>Date & Time</th><th>Type</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>Dr. {a.doctor?.firstName} {a.doctor?.lastName}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{a.doctor?.specialization || '—'}</td>
                          <td>{new Date(a.scheduledAt).toLocaleString()}</td>
                          <td><span className="badge badge-info">{a.type}</span></td>
                          <td><span className={`badge ${apptStatusClass(a.status)}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">No appointments</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <>
            <div className="page-header">
              <div className="page-title">Medical History</div>
            </div>
            <div className="dashboard-body">
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.map(c => (
                    <div key={c.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{c.medicalRecord?.title || 'Consultation'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            Dr. {c.doctor?.firstName} {c.doctor?.lastName} · {c.doctor?.specialization}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.startedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="form-grid">
                        {c.symptoms && <div><div className="profile-field-label">Symptoms</div><div className="profile-field-value">{c.symptoms}</div></div>}
                        {c.diagnosis && <div><div className="profile-field-label">Diagnosis</div><div className="profile-field-value" style={{ color: 'var(--accent-bright)' }}>{c.diagnosis}</div></div>}
                        {c.recommendations && <div><div className="profile-field-label">Recommendations</div><div className="profile-field-value">{c.recommendations}</div></div>}
                        {c.prescription && <div><div className="profile-field-label">Prescription</div><div className="profile-field-value">{c.prescription}</div></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No consultation history yet</div>
                  <div className="empty-state-desc">Completed consultations will appear here</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Profile ── */}
        {activeTab === 'profile' && (
          <>
            <div className="page-header">
              <div className="page-title">My Profile</div>
              <button className="btn btn-primary btn-sm" onClick={() => profileEdit ? handleProfileSave() : setProfileEdit(true)}>
                {profileEdit ? '💾 Save Changes' : '✏️ Edit Profile'}
              </button>
            </div>
            <div className="dashboard-body">
              <div className="card" style={{ maxWidth: 700 }}>
                <div className="form-grid" style={{ gap: 20, marginBottom: 20 }}>
                  {[
                    { label: 'First Name', key: 'firstName', type: 'text' },
                    { label: 'Last Name', key: 'lastName', type: 'text' },
                    { label: 'Phone', key: 'phone', type: 'tel' },
                    { label: 'Blood Type', key: 'bloodType', type: 'text' },
                    { label: 'Gender', key: 'gender', type: 'text' },
                    { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      {profileEdit ? (
                        <input className="form-input" type={f.type} value={profileForm[f.key] || ''} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      ) : (
                        <div className="profile-field-value">{profile?.[f.key] || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                      )}
                    </div>
                  ))}
                </div>
                {['allergies', 'medications', 'medicalHistory'].map(f => (
                  <div key={f} className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ textTransform: 'capitalize' }}>{f.replace(/([A-Z])/g, ' $1')}</label>
                    {profileEdit ? (
                      <textarea className="form-textarea" value={profileForm[f] || ''} onChange={e => setProfileForm(p => ({ ...p, [f]: e.target.value }))} placeholder={`Enter ${f}...`} />
                    ) : (
                      <div className="profile-field-value">{profile?.[f] || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Nudge overlay ── */}
      {nudging && (
        <div className="nudge-overlay">
          <div className="nudge-card">
            <div className="nudge-pulse">📞</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Requesting Consultation</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>Dr. {nudging.firstName} {nudging.lastName}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{nudgeStatus}</p>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 20px' }} />
            <button className="btn btn-ghost w-full" onClick={() => { setNudging(null); setNudgeStatus(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Appointment booking modal ── */}
      {showApptModal && selectedDoctor && (
        <AppointmentModal doctor={selectedDoctor} onBook={handleBookAppointment} onClose={() => setShowApptModal(false)} />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
