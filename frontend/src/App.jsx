import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ConsultationPage from './pages/ConsultationPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Authenticating...</span>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'DOCTOR' ? '/doctor' : '/patient'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Loading MediConnect...</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'DOCTOR' ? '/doctor' : '/patient'} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'DOCTOR' ? '/doctor' : '/patient'} /> : <RegisterPage />} />

      <Route path="/patient" element={
        <ProtectedRoute role="PATIENT">
          <PatientDashboard />
        </ProtectedRoute>
      } />

      <Route path="/doctor" element={
        <ProtectedRoute role="DOCTOR">
          <DoctorDashboard />
        </ProtectedRoute>
      } />

      <Route path="/consultation/:roomId" element={
        <ProtectedRoute>
          <ConsultationPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'DOCTOR' ? '/doctor' : '/patient'} />
          : <Navigate to="/login" />
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
