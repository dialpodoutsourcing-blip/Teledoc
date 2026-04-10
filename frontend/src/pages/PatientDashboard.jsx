import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppointmentModal from '../components/AppointmentModal';
import VideoDemoLauncher from '../components/VideoDemoLauncher';
import {
  bookAppointment,
  getAppointments,
  getDoctors,
  getPatientHistory,
  getPatientProfile,
  updatePatientProfile,
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

function toDateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function PatientDashboard() {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileEdit, setProfileEdit] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const loadDashboard = async () => {
    const [profileResponse, doctorsResponse, appointmentsResponse, historyResponse] = await Promise.all([
      getPatientProfile(),
      getDoctors(),
      getAppointments(),
      getPatientHistory(),
    ]);

    setProfile(profileResponse.data);
    setProfileForm(profileResponse.data);
    setDoctors(doctorsResponse.data);
    setAppointments(appointmentsResponse.data);
    setHistory(historyResponse.data);
  };

  useEffect(() => {
    let cancelled = false;

    loadDashboard()
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast('Failed to load patient dashboard', 'error');
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

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'ACCEPTED'),
    [appointments]
  );

  const handleBookAppointment = async (data) => {
    if (!selectedDoctor) {
      return;
    }

    try {
      await bookAppointment({
        ...data,
        doctorId: selectedDoctor.id,
        type: 'SCHEDULED',
      });

      const appointmentsResponse = await getAppointments();
      setAppointments(appointmentsResponse.data);
      setShowAppointmentModal(false);
      setSelectedDoctor(null);
      showToast('Appointment booked', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to book appointment', 'error');
    }
  };

  const handleProfileSave = async () => {
    try {
      const response = await updatePatientProfile(profileForm);
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
        <span>Loading your dashboard...</span>
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
          <div className="nav-section-label">Patient Portal</div>
          {[
            { id: 'overview', icon: 'OV', label: 'Overview' },
            { id: 'doctors', icon: 'DR', label: 'Find Doctors' },
            { id: 'appointments', icon: 'AP', label: 'Appointments' },
            { id: 'history', icon: 'HX', label: 'Medical History' },
            { id: 'profile', icon: 'PR', label: 'My Profile' },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
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
                {profile?.firstName} {profile?.lastName}
              </div>
              <div className="user-role">Patient · Logout</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Welcome, {profile?.firstName}</div>
                <div className="page-subtitle">Schedule care, review appointments, and launch the live video demo.</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Doctors</div>
                <div className="stat-value">{doctors.length}</div>
                <div className="stat-desc">Available to book</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Appointments</div>
                <div className="stat-value">{appointments.length}</div>
                <div className="stat-desc">Total bookings</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{upcomingAppointments.length}</div>
                <div className="stat-desc">Accepted consultations</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">History</div>
                <div className="stat-value">{history.length}</div>
                <div className="stat-desc">Past consultations</div>
              </div>
            </div>

            <div className="dashboard-body">
              <VideoDemoLauncher />

              <div style={{ marginTop: 28 }}>
                <div className="section-header">
                  <div className="section-title">Recent Appointments</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('appointments')}>
                    View All
                  </button>
                </div>

                {appointments.length > 0 ? (
                  appointments.slice(0, 4).map((appointment) => (
                    <div key={appointment.id} className="appt-item">
                      <div className="appt-info">
                        <div className="appt-doctor">
                          Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                        </div>
                        <div className="appt-meta">
                          {appointment.doctor?.specialization || 'General Physician'} · {formatDisplayDate(appointment.scheduledAt)}
                        </div>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>{appointment.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">AP</div>
                    <div className="empty-state-title">No appointments yet</div>
                    <div className="empty-state-desc">Browse doctors and book your first consultation.</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'doctors' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Find a Doctor</div>
                <div className="page-subtitle">Pick a clinician, then book a scheduled appointment.</div>
              </div>
            </div>

            <div className="dashboard-body">
              {doctors.length > 0 ? (
                <div className="doctor-grid">
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="doctor-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div className="doctor-avatar-lg">
                          {doctor.firstName?.[0]}
                          {doctor.lastName?.[0]}
                        </div>
                        <span className="badge badge-info">Available to book</span>
                      </div>

                      <div className="doctor-name">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </div>
                      <div className="doctor-spec">{doctor.specialization || 'General Physician'}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', minHeight: 40 }}>
                        {doctor.bio || 'Open for scheduled consultations and follow-up visits.'}
                      </div>

                      <button
                        className="btn btn-primary btn-sm w-full"
                        style={{ marginTop: 16 }}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setShowAppointmentModal(true);
                        }}
                      >
                        Schedule Appointment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">DR</div>
                  <div className="empty-state-title">No doctors available</div>
                  <div className="empty-state-desc">Registered doctors will appear here once added.</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'appointments' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">My Appointments</div>
                <div className="page-subtitle">Track upcoming and previous booking requests.</div>
              </div>
            </div>

            <div className="dashboard-body">
              {appointments.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id}>
                          <td style={{ fontWeight: 600 }}>
                            Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                          </td>
                          <td>{appointment.doctor?.specialization || '-'}</td>
                          <td>{formatDisplayDate(appointment.scheduledAt)}</td>
                          <td>
                            <span className="badge badge-info">{appointment.type}</span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>{appointment.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">AP</div>
                  <div className="empty-state-title">No appointments</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Medical History</div>
                <div className="page-subtitle">Review notes from completed consultations.</div>
              </div>
            </div>

            <div className="dashboard-body">
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.map((consultation) => (
                    <div key={consultation.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>
                            {consultation.medicalRecord?.title || 'Consultation'}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            Dr. {consultation.doctor?.firstName} {consultation.doctor?.lastName}
                            {' · '}
                            {consultation.doctor?.specialization || 'General Physician'}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDisplayDate(consultation.startedAt, { dateStyle: 'medium' })}
                        </div>
                      </div>

                      <div className="form-grid">
                        <div>
                          <div className="profile-field-label">Symptoms</div>
                          <div className="profile-field-value">{consultation.symptoms || '-'}</div>
                        </div>
                        <div>
                          <div className="profile-field-label">Diagnosis</div>
                          <div className="profile-field-value">{consultation.diagnosis || '-'}</div>
                        </div>
                        <div>
                          <div className="profile-field-label">Recommendations</div>
                          <div className="profile-field-value">{consultation.recommendations || '-'}</div>
                        </div>
                        <div>
                          <div className="profile-field-label">Prescription</div>
                          <div className="profile-field-value">{consultation.prescription || '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">HX</div>
                  <div className="empty-state-title">No consultation history yet</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">My Profile</div>
                <div className="page-subtitle">Update your personal and medical details.</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={profileEdit ? handleProfileSave : () => setProfileEdit(true)}>
                {profileEdit ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <div className="dashboard-body">
              <div className="card" style={{ maxWidth: 760 }}>
                <div className="form-grid" style={{ gap: 20, marginBottom: 20 }}>
                  {[
                    { label: 'First Name', key: 'firstName', type: 'text' },
                    { label: 'Last Name', key: 'lastName', type: 'text' },
                    { label: 'Phone', key: 'phone', type: 'tel' },
                    { label: 'Blood Type', key: 'bloodType', type: 'text' },
                    { label: 'Gender', key: 'gender', type: 'text' },
                    { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
                  ].map((field) => (
                    <div key={field.key} className="form-group">
                      <label className="form-label">{field.label}</label>
                      {profileEdit ? (
                        <input
                          className="form-input"
                          type={field.type}
                          value={field.key === 'dateOfBirth' ? toDateInputValue(profileForm[field.key]) : profileForm[field.key] || ''}
                          onChange={(event) =>
                            setProfileForm((current) => ({ ...current, [field.key]: event.target.value }))
                          }
                        />
                      ) : (
                        <div className="profile-field-value">
                          {field.key === 'dateOfBirth'
                            ? formatDisplayDate(profile?.[field.key], { dateStyle: 'medium' })
                            : profile?.[field.key] || '-'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {['allergies', 'medications', 'medicalHistory'].map((field) => (
                  <div key={field} className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" style={{ textTransform: 'capitalize' }}>
                      {field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    {profileEdit ? (
                      <textarea
                        className="form-textarea"
                        value={profileForm[field] || ''}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, [field]: event.target.value }))
                        }
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                      />
                    ) : (
                      <div className="profile-field-value">{profile?.[field] || '-'}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {showAppointmentModal && selectedDoctor && (
        <AppointmentModal
          doctor={selectedDoctor}
          onBook={handleBookAppointment}
          onClose={() => {
            setShowAppointmentModal(false);
            setSelectedDoctor(null);
          }}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
