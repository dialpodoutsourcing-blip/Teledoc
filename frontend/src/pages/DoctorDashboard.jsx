import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  getDoctorProfile, updateDoctorProfile, toggleAvailability,
  getDoctorAppointments, updateAppointmentStatus,
  startConsultation, getDoctorConsultationHistory
} from '../services/api';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomingNudge, setIncomingNudge] = useState(null);
  const [toast, setToast] = useState(null);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([getDoctorProfile(), getDoctorAppointments(), getDoctorConsultationHistory()])
      .then(([p, a, h]) => {
        setProfile(p.data);
        setProfileForm(p.data);
        setAppointments(a.data);
        setHistory(h.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Socket: listen for incoming nudges
  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_nudge', (data) => {
      setIncomingNudge(data);
    });

    return () => {
      socket.off('incoming_nudge');
    };
  }, [socket]);

  const handleToggleAvailability = async () => {
    try {
      const res = await toggleAvailability(!profile.isOnline);
      setProfile(p => ({ ...p, isOnline: res.data.isOnline }));
      showToast(res.data.isOnline ? 'You are now Online' : 'You are now Offline');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleAcceptNudge = async () => {
    if (!incomingNudge) return;
    const roomId = `room_${Date.now()}`;
    try {
      const consultation = await startConsultation({
        appointmentId: incomingNudge.appointmentId,
        patientId: incomingNudge.patientProfileId,
        roomId,
      });

      socket.emit('nudge_response', {
        accepted: true,
        patientUserId: incomingNudge.patientUserId,
        roomId,
        consultationId: consultation.data.id,
        appointmentId: incomingNudge.appointmentId,
      });

      socket.emit('join_room', { roomId });
      setIncomingNudge(null);
      navigate(`/consultation/${roomId}`);
    } catch (err) {
      showToast('Failed to start consultation', 'error');
    }
  };

  const handleRejectNudge = () => {
    if (!socket || !incomingNudge) return;
    socket.emit('nudge_response', {
      accepted: false,
      patientUserId: incomingNudge.patientUserId,
    });
    setIncomingNudge(null);
  };

  const handleAcceptAppointment = async (apptId) => {
    try {
      await updateAppointmentStatus(apptId, 'ACCEPTED');
      const res = await getDoctorAppointments();
      setAppointments(res.data);
      showToast('Appointment accepted', 'success');
    } catch {
      showToast('Failed to update appointment', 'error');
    }
  };

  const handleRejectAppointment = async (apptId) => {
    try {
      await updateAppointmentStatus(apptId, 'REJECTED');
      const res = await getDoctorAppointments();
      setAppointments(res.data);
    } catch {
      showToast('Failed to update appointment', 'error');
    }
  };

  const handleStartScheduledCall = async (appt) => {
    const roomId = `room_${Date.now()}`;
    try {
      await startConsultation({
        appointmentId: appt.id,
        patientId: appt.patientId,
        roomId,
      });
      socket?.emit('join_room', { roomId });
      navigate(`/consultation/${roomId}`);
    } catch {
      showToast('Failed to start call', 'error');
    }
  };

  const handleProfileSave = async () => {
    try {
      const res = await updateDoctorProfile(profileForm);
      setProfile(res.data);
      setProfileEdit(false);
      showToast('Profile updated!', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    }
  };

  const apptStatusClass = (s) => {
    if (s === 'ACCEPTED') return 'badge-success';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-danger';
    if (s === 'COMPLETED') return 'badge-muted';
    return 'badge-warning';
  };

  const pendingAppts = appointments.filter(a => a.status === 'PENDING');
  const acceptedAppts = appointments.filter(a => a.status === 'ACCEPTED');

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Loading dashboard...</span>
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
          <div className="nav-section-label">Doctor Portal</div>
          {[
            { id: 'overview', icon: '🏠', label: 'Overview' },
            { id: 'appointments', icon: '📅', label: 'Appointments' },
            { id: 'history', icon: '📋', label: 'Consultation Log' },
            { id: 'profile', icon: '👤', label: 'My Profile' },
          ].map(item => (
            <button key={item.id} id={`nav-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'appointments' && pendingAppts.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--warning)', color: '#000', borderRadius: '999px', padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                  {pendingAppts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill" onClick={logout} title="Logout">
            <div className="user-avatar">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</div>
            <div className="user-info">
              <div className="user-name">Dr. {profile?.firstName} {profile?.lastName}</div>
              <div className="user-role">Doctor · Logout →</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Doctor Dashboard</div>
                <div className="page-subtitle">Dr. {profile?.firstName} {profile?.lastName} · {profile?.specialization || 'General Physician'}</div>
              </div>
              <button
                id="availability-toggle"
                className={`availability-toggle ${profile?.isOnline ? 'online' : ''}`}
                onClick={handleToggleAvailability}
              >
                <div className={`toggle-switch ${profile?.isOnline ? 'on' : ''}`} />
                {profile?.isOnline ? '🟢 Online' : '⚫ Offline'}
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Status</div>
                <div className="stat-value" style={{ color: profile?.isOnline ? 'var(--success)' : 'var(--text-muted)', fontSize: 20 }}>
                  {profile?.isOnline ? 'Online' : 'Offline'}
                </div>
                <div className="stat-desc">Availability</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Pending</div>
                <div className="stat-value" style={{ color: 'var(--warning)' }}>{pendingAppts.length}</div>
                <div className="stat-desc">Awaiting response</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{acceptedAppts.length}</div>
                <div className="stat-desc">Accepted</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed</div>
                <div className="stat-value">{history.length}</div>
                <div className="stat-desc">Consultations</div>
              </div>
            </div>

            <div className="dashboard-body">
              {pendingAppts.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div className="section-header">
                    <div className="section-title">⏳ Pending Requests</div>
                  </div>
                  {pendingAppts.map(appt => (
                    <div key={appt.id} className="appt-item" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                      <div className="appt-info">
                        <div className="appt-doctor">{appt.patient?.firstName} {appt.patient?.lastName}</div>
                        <div className="appt-meta">
                          <span className="badge badge-info" style={{ marginRight: 6 }}>{appt.type}</span>
                          {new Date(appt.scheduledAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button id={`accept-${appt.id}`} className="btn btn-success btn-sm" onClick={() => handleAcceptAppointment(appt.id)}>Accept</button>
                        <button id={`reject-${appt.id}`} className="btn btn-ghost btn-sm" onClick={() => handleRejectAppointment(appt.id)}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {acceptedAppts.length > 0 && (
                <div>
                  <div className="section-header">
                    <div className="section-title">✅ Upcoming Appointments</div>
                  </div>
                  {acceptedAppts.map(appt => (
                    <div key={appt.id} className="appt-item" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                      <div className="appt-info">
                        <div className="appt-doctor">{appt.patient?.firstName} {appt.patient?.lastName}</div>
                        <div className="appt-meta">{new Date(appt.scheduledAt).toLocaleString()}</div>
                      </div>
                      <button id={`start-call-${appt.id}`} className="btn btn-primary btn-sm" onClick={() => handleStartScheduledCall(appt)}>
                        📞 Start Call
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {appointments.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">No appointments yet</div>
                  <div className="empty-state-desc">Turn on availability to receive nudges from patients</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Appointments ── */}
        {activeTab === 'appointments' && (
          <>
            <div className="page-header">
              <div className="page-title">All Appointments</div>
            </div>
            <div className="dashboard-body">
              {appointments.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Patient</th><th>Scheduled</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>{a.patient?.firstName} {a.patient?.lastName}</td>
                          <td>{new Date(a.scheduledAt).toLocaleString()}</td>
                          <td><span className="badge badge-info">{a.type}</span></td>
                          <td><span className={`badge ${apptStatusClass(a.status)}`}>{a.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {a.status === 'PENDING' && <>
                                <button className="btn btn-success btn-sm" onClick={() => handleAcceptAppointment(a.id)}>Accept</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleRejectAppointment(a.id)}>Reject</button>
                              </>}
                              {a.status === 'ACCEPTED' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleStartScheduledCall(a)}>Start Call</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">No appointments yet</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Consultation History ── */}
        {activeTab === 'history' && (
          <>
            <div className="page-header">
              <div className="page-title">Consultation Log</div>
            </div>
            <div className="dashboard-body">
              {history.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Patient</th><th>Date</th><th>Diagnosis</th><th>Duration</th></tr>
                    </thead>
                    <tbody>
                      {history.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.patient?.firstName} {c.patient?.lastName}</td>
                          <td>{new Date(c.startedAt).toLocaleDateString()}</td>
                          <td>{c.diagnosis || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                          <td>{c.duration || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No completed consultations</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Profile ── */}
        {activeTab === 'profile' && (
          <>
            <div className="page-header">
              <div className="page-title">Doctor Profile</div>
              <button className="btn btn-primary btn-sm" onClick={() => profileEdit ? handleProfileSave() : setProfileEdit(true)}>
                {profileEdit ? '💾 Save Changes' : '✏️ Edit Profile'}
              </button>
            </div>
            <div className="dashboard-body">
              <div className="card" style={{ maxWidth: 600 }}>
                <div className="form-grid" style={{ marginBottom: 20 }}>
                  {[
                    { label: 'First Name', key: 'firstName' },
                    { label: 'Last Name', key: 'lastName' },
                    { label: 'Specialization', key: 'specialization' },
                    { label: 'License Number', key: 'licenseNumber' },
                    { label: 'Phone', key: 'phone' },
                  ].map(f => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      {profileEdit ? (
                        <input className="form-input" value={profileForm[f.key] || ''} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      ) : (
                        <div className="profile-field-value">{profile?.[f.key] || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  {profileEdit ? (
                    <textarea className="form-textarea" value={profileForm.bio || ''} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief professional bio..." />
                  ) : (
                    <div className="profile-field-value">{profile?.bio || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Incoming Nudge notification ── */}
      {incomingNudge && (
        <div className="incoming-notification">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-dim)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, animation: 'ring-pulse 1.5s infinite' }}>📞</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Incoming Consultation</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{incomingNudge.patientName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="accept-nudge" className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={handleAcceptNudge}>Accept</button>
            <button id="reject-nudge" className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleRejectNudge}>Reject</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
