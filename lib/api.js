import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getSessionMe = () => api.get('/session/me');

export const getDoctors = () => api.get('/doctors');
export const getDoctorProfile = () => api.get('/doctors/profile');
export const updateDoctorProfile = (data) => api.put('/doctors/profile', data);
export const toggleAvailability = (isOnline) => api.patch('/doctors/availability', { isOnline });
export const getDoctorAppointments = () => api.get('/doctors/appointments');

export const getPatientProfile = () => api.get('/patients/profile');
export const updatePatientProfile = (data) => api.put('/patients/profile', data);
export const getPatientById = (id) => api.get(`/patients/${id}`);
export const getPatientHistory = () => api.get('/patients/history');

export const bookAppointment = (data) => api.post('/appointments', data);
export const getAppointments = () => api.get('/appointments');
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });

export const startConsultation = (data) => api.post('/consultations/start', data);
export const getConsultation = (id) => api.get(`/consultations/${id}`);
export const getConsultationByRoom = (roomId) => api.get(`/consultations/room/${roomId}`);
export const updateConsultation = (id, data) => api.put(`/consultations/${id}`, data);
export const submitDisposition = (id, data) => api.post(`/consultations/${id}/disposition`, data);
export const getDoctorConsultationHistory = () => api.get('/consultations/doctor/history');

export default api;
