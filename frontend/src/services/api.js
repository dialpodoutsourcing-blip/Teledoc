import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Doctors
export const getDoctors = () => api.get('/doctors');
export const getDoctorProfile = () => api.get('/doctors/profile');
export const updateDoctorProfile = (data) => api.put('/doctors/profile', data);
export const toggleAvailability = (isOnline) => api.patch('/doctors/availability', { isOnline });
export const getDoctorAppointments = () => api.get('/doctors/appointments');

// Patients
export const getPatientProfile = () => api.get('/patients/profile');
export const updatePatientProfile = (data) => api.put('/patients/profile', data);
export const getPatientById = (id) => api.get(`/patients/${id}`);
export const getPatientHistory = () => api.get('/patients/history');

// Appointments
export const bookAppointment = (data) => api.post('/appointments', data);
export const getAppointments = () => api.get('/appointments');
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });

// Consultations
export const startConsultation = (data) => api.post('/consultations/start', data);
export const getConsultation = (id) => api.get(`/consultations/${id}`);
export const getConsultationByRoom = (roomId) => api.get(`/consultations/room/${roomId}`);
export const updateConsultation = (id, data) => api.put(`/consultations/${id}`, data);
export const submitDisposition = (id, data) => api.post(`/consultations/${id}/disposition`, data);
export const getDoctorConsultationHistory = () => api.get('/consultations/doctor/history');

export default api;
