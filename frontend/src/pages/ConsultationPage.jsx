import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { getConsultationByRoom, submitDisposition, updateConsultation } from '../services/api';
import * as WebRTC from '../services/webrtc';
import PatientProfile from '../components/PatientProfile';
import ConsultationForm from '../components/ConsultationForm';

export default function ConsultationPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerSocketRef = useRef(null);
  const timerRef = useRef(null);

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callState, setCallState] = useState('connecting'); // connecting | active | ended
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [showDisposition, setShowDisposition] = useState(false);
  const [dispositionForm, setDispositionForm] = useState({ diagnosis: '', recommendations: '', prescription: '', followUpDate: '' });
  const [formData, setFormData] = useState({ symptoms: '', duration: '', notes: '', vitalSigns: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const isDoctor = user?.role === 'DOCTOR';

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Start call timer
  const startTimer = () => {
    timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Load consultation + init WebRTC
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const res = await getConsultationByRoom(roomId);
        if (mounted) {
          setConsultation(res.data);
          if (res.data.symptoms) setFormData(f => ({ ...f, symptoms: res.data.symptoms || '' }));
        }

        // Init local stream
        await WebRTC.initLocalStream(localVideoRef.current);

        // Create peer connection
        WebRTC.createPeerConnection(
          (candidate) => {
            socket?.emit('webrtc_ice_candidate', { roomId, candidate, targetSocketId: peerSocketRef.current });
          },
          (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              setCallState('active');
              startTimer();
            }
          },
          (state) => {
            if (state === 'disconnected' || state === 'failed') {
              setCallState('ended');
            }
          }
        );

        if (mounted) setLoading(false);
      } catch (err) {
        console.error('[Consultation] Init error:', err);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      WebRTC.closeConnection();
    };
  }, [roomId]);

  // Socket signaling events
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', { roomId });

    socket.on('peer_joined', async ({ socketId }) => {
      peerSocketRef.current = socketId;
      // Initiator creates and sends offer
      const offer = await WebRTC.createOffer();
      if (offer) {
        socket.emit('webrtc_offer', { roomId, offer, targetSocketId: socketId });
      }
    });

    socket.on('webrtc_offer', async ({ offer, fromSocketId }) => {
      peerSocketRef.current = fromSocketId;
      const answer = await WebRTC.handleOffer(offer);
      if (answer) {
        socket.emit('webrtc_answer', { roomId, answer, targetSocketId: fromSocketId });
      }
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      await WebRTC.handleAnswer(answer);
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      await WebRTC.addIceCandidate(candidate);
    });

    socket.on('peer_left', () => {
      setCallState('ended');
      clearInterval(timerRef.current);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });

    socket.on('call_ended', () => {
      setCallState('ended');
      clearInterval(timerRef.current);
    });

    return () => {
      socket.off('peer_joined');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('peer_left');
      socket.off('call_ended');
    };
  }, [socket, roomId]);

  const toggleAudio = () => {
    const newState = !audioMuted;
    WebRTC.toggleAudio(!newState);
    setAudioMuted(newState);
  };

  const toggleVideo = () => {
    const newState = !videoOff;
    WebRTC.toggleVideo(!newState);
    setVideoOff(newState);
  };

  const handleEndCall = () => {
    if (isDoctor) {
      setShowDisposition(true);
    } else {
      socket?.emit('call_ended', { roomId });
      cleanup();
    }
  };

  const cleanup = () => {
    clearInterval(timerRef.current);
    WebRTC.closeConnection();
    navigate(isDoctor ? '/doctor' : '/patient');
  };

  const handleFormSave = async (data) => {
    setFormData(data);
    if (!consultation?.id) return;
    try {
      await updateConsultation(consultation.id, data);
    } catch (err) {
      console.error('Auto-save failed');
    }
  };

  const handleSubmitDisposition = async () => {
    if (!dispositionForm.diagnosis.trim()) {
      showToast('Diagnosis is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitDisposition(consultation.id, {
        ...dispositionForm,
        ...formData,
        duration: `${Math.floor(callSeconds / 60)} min`,
      });
      socket?.emit('call_ended', { roomId });
      showToast('Consultation saved!', 'success');
      setTimeout(() => cleanup(), 1200);
    } catch (err) {
      showToast('Failed to save consultation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Joining consultation room...</span>
    </div>
  );

  return (
    <div className="consultation-layout">
      {/* ── Left panel ── */}
      <div className="consultation-sidebar">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Active Consultation</span>
          <span className={`badge ${callState === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 'auto' }}>
            {callState === 'active' ? '🔴 Live' : callState === 'connecting' ? 'Connecting...' : 'Ended'}
          </span>
        </div>

        {isDoctor ? (
          // Doctor sees patient profile + consultation form on left
          <>
            {consultation?.patient && (
              <PatientProfile patient={consultation.patient} />
            )}
          </>
        ) : (
          // Patient sees call info
          <div className="profile-section">
            <div className="profile-section-title">Your Doctor</div>
            {consultation?.doctor && (
              <>
                <div className="profile-field">
                  <div className="profile-field-label">Name</div>
                  <div className="profile-field-value">Dr. {consultation.doctor.firstName} {consultation.doctor.lastName}</div>
                </div>
                <div className="profile-field">
                  <div className="profile-field-label">Specialization</div>
                  <div className="profile-field-value">{consultation.doctor.specialization || 'General Physician'}</div>
                </div>
              </>
            )}
            <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>🔒</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>End-to-end encrypted consultation</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="consultation-main">
        {isDoctor ? (
          // Doctor: video on top-half, form on bottom
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', height: '100%', overflow: 'hidden' }}>
            {/* Video */}
            <div className="video-area" style={{ borderBottom: '1px solid var(--border)' }}>
              {callState === 'active' ? (
                <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
              ) : (
                <div className="video-placeholder">
                  <div className="avatar-xl">
                    {consultation?.patient?.firstName?.[0]}{consultation?.patient?.lastName?.[0]}
                  </div>
                  <div>{callState === 'connecting' ? 'Waiting for patient...' : 'Call ended'}</div>
                </div>
              )}
              <video ref={localVideoRef} className="video-local" autoPlay playsInline muted />
              <div className="call-controls">
                <button className={`ctrl-btn ${audioMuted ? 'ctrl-btn-muted' : 'ctrl-btn-default'}`} onClick={toggleAudio} title={audioMuted ? 'Unmute' : 'Mute'}>
                  {audioMuted ? '🔇' : '🎤'}
                </button>
                <button className={`ctrl-btn ${videoOff ? 'ctrl-btn-muted' : 'ctrl-btn-default'}`} onClick={toggleVideo} title={videoOff ? 'Show video' : 'Hide video'}>
                  {videoOff ? '📵' : '📹'}
                </button>
                <div className="call-timer">{formatTime(callSeconds)}</div>
                <button id="end-call" className="ctrl-btn ctrl-btn-danger" onClick={handleEndCall} title="End call">
                  📵
                </button>
              </div>
            </div>

            {/* Consultation Form */}
            <ConsultationForm
              consultationId={consultation?.id}
              initialData={formData}
              onSave={handleFormSave}
            />
          </div>
        ) : (
          // Patient: full video
          <div className="video-area" style={{ height: '100%' }}>
            {callState === 'active' ? (
              <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
            ) : (
              <div className="video-placeholder">
                <div className="avatar-xl">
                  {consultation?.doctor?.firstName?.[0]}{consultation?.doctor?.lastName?.[0]}
                </div>
                <div style={{ fontWeight: 600 }}>Dr. {consultation?.doctor?.firstName} {consultation?.doctor?.lastName}</div>
                <div style={{ fontSize: 13 }}>{callState === 'connecting' ? 'Connecting to doctor...' : 'Call has ended'}</div>
              </div>
            )}
            <video ref={localVideoRef} className="video-local" autoPlay playsInline muted />
            <div className="call-controls">
              <button className={`ctrl-btn ${audioMuted ? 'ctrl-btn-muted' : 'ctrl-btn-default'}`} onClick={toggleAudio}>
                {audioMuted ? '🔇' : '🎤'}
              </button>
              <button className={`ctrl-btn ${videoOff ? 'ctrl-btn-muted' : 'ctrl-btn-default'}`} onClick={toggleVideo}>
                {videoOff ? '📵' : '📹'}
              </button>
              <div className="call-timer">{formatTime(callSeconds)}</div>
              <button className="ctrl-btn ctrl-btn-danger" onClick={handleEndCall}>📵</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Disposition Modal ── */}
      {showDisposition && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">📋 Doctor's Assessment</div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Complete the disposition before ending the consultation. This will be saved to the patient's record.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Diagnosis / Clinical Impression <span className="form-required">*</span></label>
                <textarea
                  id="disp-diagnosis"
                  className="form-textarea"
                  placeholder="Primary diagnosis or clinical impression..."
                  value={dispositionForm.diagnosis}
                  onChange={e => setDispositionForm(p => ({ ...p, diagnosis: e.target.value }))}
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Recommendations</label>
                <textarea
                  id="disp-recommendations"
                  className="form-textarea"
                  placeholder="Treatment plan, lifestyle advice, referrals..."
                  value={dispositionForm.recommendations}
                  onChange={e => setDispositionForm(p => ({ ...p, recommendations: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prescription Notes</label>
                <textarea
                  id="disp-prescription"
                  className="form-textarea"
                  placeholder="Medications, dosage, instructions..."
                  value={dispositionForm.prescription}
                  onChange={e => setDispositionForm(p => ({ ...p, prescription: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input
                  id="disp-followup"
                  className="form-input"
                  type="date"
                  value={dispositionForm.followUpDate}
                  onChange={e => setDispositionForm(p => ({ ...p, followUpDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDisposition(false)} disabled={submitting}>Continue Call</button>
              <button id="submit-disposition" className="btn btn-primary" onClick={handleSubmitDisposition} disabled={submitting}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : '✅ End & Save Consultation'}
              </button>
            </div>
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
