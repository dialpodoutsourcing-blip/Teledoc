import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VideoDemoLauncher from '../components/VideoDemoLauncher';
import {
  getDoctorAppointments,
  getDoctorConsultationHistory,
  getDoctorProfile,
  updateAppointmentStatus,
  updateDoctorProfile,
} from '../services/api';

function getStatusBadgeClass(status) {
  if (status === 'ACCEPTED') return 'badge-success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'badge-danger';
  if (status === 'COMPLETED') return 'badge-muted';
  return 'badge-warning';
}

function formatDisplayDate(value, options) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString(undefined, options);
}

export default function DoctorDashboard() {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileEdit, setProfileEdit] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const loadDashboard = async () => {
    const [profileResponse, appointmentsResponse, historyResponse] = await Promise.all([
      getDoctorProfile(),
      getDoctorAppointments(),
      getDoctorConsultationHistory(),
    ]);

    setProfile(profileResponse.data);
    setProfileForm(profileResponse.data);
    setAppointments(appointmentsResponse.data);
    setHistory(historyResponse.data);
  };

  useEffect(() => {
    let cancelled = false;

    loadDashboard()
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast('Failed to load doctor dashboard', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'PENDING'),
    [appointments]
  );

  const acceptedAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'ACCEPTED'),
    [appointments]
  );

  const refreshAppointments = async () => {
    const response = await getDoctorAppointments();
    setAppointments(response.data);
  };

  const handleAppointmentStatus = async (appointmentId, status) => {
    try {
      await updateAppointmentStatus(appointmentId, status);
      await refreshAppointments();
      showToast(
        status === 'ACCEPTED' ? 'Appointment accepted' : 'Appointment rejected',
        status === 'ACCEPTED' ? 'success' : 'info'
      );
    } catch (error) {
      console.error(error);
      showToast('Failed to update appointment', 'error');
    }
  };

  const handleProfileSave = async () => {
    try {
      const response = await updateDoctorProfile(profileForm);
      setProfile(response.data);
      setProfileForm(response.data);
      setProfileEdit(false);
      showToast('Profile updated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="app-layout">
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
            { id: 'overview', icon: 'OV', label: 'Overview' },
            { id: 'appointments', icon: 'AP', label: 'Appointments' },
            { id: 'history', icon: 'HX', label: 'Consultation Log' },
            { id: 'profile', icon: 'PR', label: 'My Profile' },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'appointments' && pendingAppointments.length > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--warning)',
                    color: '#000',
                    borderRadius: '999px',
                    padding: '2px 7px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {pendingAppointments.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill" onClick={logout} title="Logout">
            <div className="user-avatar">
              {profile?.firstName?.[0]}
              {profile?.lastName?.[0]}
            </div>
            <div className="user-info">
              <div className="user-name">
                Dr. {profile?.firstName} {profile?.lastName}
              </div>
              <div className="user-role">Doctor · Logout</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Doctor Dashboard</div>
                <div className="page-subtitle">
                  Dr. {profile?.firstName} {profile?.lastName} · {profile?.specialization || 'General Physician'}
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Pending</div>
                <div className="stat-value" style={{ color: 'var(--warning)' }}>
                  {pendingAppointments.length}
                </div>
                <div className="stat-desc">Awaiting response</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{acceptedAppointments.length}</div>
                <div className="stat-desc">Accepted appointments</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed</div>
                <div className="stat-value">{history.length}</div>
                <div className="stat-desc">Recorded consultations</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Specialty</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {profile?.specialization || 'General'}
                </div>
                <div className="stat-desc">Current profile</div>
              </div>
            </div>

            <div className="dashboard-body">
              <VideoDemoLauncher />

              {pendingAppointments.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="section-header">
                    <div className="section-title">Pending Requests</div>
                  </div>
                  {pendingAppointments.map((appointment) => (
                    <div key={appointment.id} className="appt-item" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                      <div className="appt-info">
                        <div className="appt-doctor">
                          {appointment.patient?.firstName} {appointment.patient?.lastName}
                        </div>
                        <div className="appt-meta">
                          <span className="badge badge-info" style={{ marginRight: 8 }}>
                            {appointment.type}
                          </span>
                          {formatDisplayDate(appointment.scheduledAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleAppointmentStatus(appointment.id, 'ACCEPTED')}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleAppointmentStatus(appointment.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {acceptedAppointments.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="section-header">
                    <div className="section-title">Upcoming Appointments</div>
                  </div>
                  {acceptedAppointments.map((appointment) => (
                    <div key={appointment.id} className="appt-item" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
                      <div className="appt-info">
                        <div className="appt-doctor">
                          {appointment.patient?.firstName} {appointment.patient?.lastName}
                        </div>
                        <div className="appt-meta">
                          {formatDisplayDate(appointment.scheduledAt)} · {appointment.reason || 'Scheduled consultation'}
                        </div>
                      </div>
                      <span className="badge badge-success">Use Video Demo room when ready</span>
                    </div>
                  ))}
                </div>
              )}

              {appointments.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">AP</div>
                  <div className="empty-state-title">No appointments yet</div>
                  <div className="empty-state-desc">Accepted bookings and consultation history will show up here.</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'appointments' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">All Appointments</div>
                <div className="page-subtitle">Manage scheduled patient bookings.</div>
              </div>
            </div>

            <div className="dashboard-body">
              {appointments.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Scheduled</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td style={{ fontWeight: 600 }}>
                            {appointment.patient?.firstName} {appointment.patient?.lastName}
                          </td>
                          <td>{formatDisplayDate(appointment.scheduledAt)}</td>
                          <td>
                            <span className="badge badge-info">{appointment.type}</span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>{appointment.status}</span>
                          </td>
                          <td>
                            {appointment.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleAppointmentStatus(appointment.id, 'ACCEPTED')}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleAppointmentStatus(appointment.id, 'REJECTED')}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">No action needed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">AP</div>
                  <div className="empty-state-title">No appointments yet</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Consultation Log</div>
                <div className="page-subtitle">Previously completed consultations and notes.</div>
              </div>
            </div>

            <div className="dashboard-body">
              {history.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Diagnosis</th>
                        <th>Recommendations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((consultation) => (
                        <tr key={consultation.id}>
                          <td style={{ fontWeight: 600 }}>
                            {consultation.patient?.firstName} {consultation.patient?.lastName}
                          </td>
                          <td>{formatDisplayDate(consultation.startedAt, { dateStyle: 'medium' })}</td>
                          <td>{consultation.diagnosis || '-'}</td>
                          <td>{consultation.recommendations || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">HX</div>
                  <div className="empty-state-title">No completed consultations</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Doctor Profile</div>
                <div className="page-subtitle">Keep your public medical details up to date.</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={profileEdit ? handleProfileSave : () => setProfileEdit(true)}>
                {profileEdit ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <div className="dashboard-body">
              <div className="card" style={{ maxWidth: 680 }}>
                <div className="form-grid" style={{ marginBottom: 20 }}>
                  {[
                    { label: 'First Name', key: 'firstName' },
                    { label: 'Last Name', key: 'lastName' },
                    { label: 'Specialization', key: 'specialization' },
                    { label: 'License Number', key: 'licenseNumber' },
                    { label: 'Phone', key: 'phone' },
                  ].map((field) => (
                    <div key={field.key} className="form-group">
                      <label className="form-label">{field.label}</label>
                      {profileEdit ? (
                        <input
                          className="form-input"
                          value={profileForm[field.key] || ''}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, [field.key]: event.target.value }))
                          }
                        />
                      ) : (
                        <div className="profile-field-value">{profile?.[field.key] || '-'}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="form-group">
                  <label className="form-label">Bio</label>
                  {profileEdit ? (
                    <textarea
                      className="form-textarea"
                      value={profileForm.bio || ''}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, bio: event.target.value }))
                      }
                      placeholder="Brief professional summary"
                    />
                  ) : (
                    <div className="profile-field-value">{profile?.bio || '-'}</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
