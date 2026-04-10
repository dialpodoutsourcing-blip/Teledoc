import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useVideoRoom } from '../hooks/useVideoRoom';

function formatCallState(callState) {
  switch (callState) {
    case 'joined':
      return 'Joined and waiting';
    case 'calling':
      return 'Calling';
    case 'answering':
      return 'Answering incoming offer';
    case 'connected':
      return 'Connected';
    case 'ended':
      return 'Ended';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

export default function ConsultationPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copyState, setCopyState] = useState('Copy Room ID');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const {
    channelState,
    isChannelReady,
    callState,
    localStream,
    remoteStream,
    audioMuted,
    videoOff,
    error,
    isConfigured,
    joinCall,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useVideoRoom(roomId);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (copyState === 'Copy Room ID') {
      return undefined;
    }

    const timerId = window.setTimeout(() => setCopyState('Copy Room ID'), 1800);
    return () => window.clearTimeout(timerId);
  }, [copyState]);

  const handleLeaveRoom = async () => {
    await endCall();
    navigate(user?.role === 'DOCTOR' ? '/doctor' : '/patient');
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyState('Copied');
    } catch (copyError) {
      console.error('[ConsultationPage] Failed to copy room ID', copyError);
      setCopyState('Copy failed');
    }
  };

  return (
    <div className="consultation-layout">
      <aside className="consultation-sidebar">
        <div className="profile-section">
          <div className="profile-section-title">Video Demo Room</div>
          <div className="profile-field">
            <div className="profile-field-label">Room ID</div>
            <div className="profile-field-value consultation-room-id">{roomId}</div>
            <button className="btn btn-ghost btn-sm consultation-copy-btn" type="button" onClick={handleCopyRoomId}>
              {copyState}
            </button>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Channel</div>
            <div className="profile-field-value">{channelState}</div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Call State</div>
            <div className="profile-field-value">{formatCallState(callState)}</div>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">How To Test</div>
          <div className="profile-field-value" style={{ color: 'var(--text-secondary)' }}>
            Open the same room in two browsers. The receiver clicks Join Call / Answer first, then the caller clicks Start Call.
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Room Readiness</div>
          <div className="profile-field-value" style={{ color: isChannelReady ? 'var(--success)' : 'var(--warning)' }}>
            {isChannelReady ? 'Room subscribed and ready for signaling.' : 'Waiting for Supabase channel subscription.'}
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Demo Scope</div>
          <div className="profile-field-value" style={{ color: 'var(--text-secondary)' }}>
            This room is a lightweight 1-on-1 video demo powered by WebRTC and Supabase Realtime signaling.
          </div>
        </div>

        {!isConfigured && (
          <div className="profile-section">
            <div className="profile-section-title">Supabase Setup</div>
            <div className="form-error">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable signaling.
            </div>
          </div>
        )}

        {error && (
          <div className="profile-section">
            <div className="profile-section-title">Error</div>
            <div className="form-error">{error}</div>
          </div>
        )}
      </aside>

      <main className="consultation-main">
        <div className="video-area">
          {remoteStream ? (
            <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
          ) : (
            <div className="video-placeholder">
              <div className="avatar-xl">RT</div>
              <div>Remote participant video will appear here</div>
            </div>
          )}
          <video ref={localVideoRef} className="video-local" autoPlay playsInline muted />
        </div>

        <div className="call-controls">
          <button className="btn btn-primary" type="button" onClick={joinCall} disabled={!isConfigured || !isChannelReady}>
            Join Call / Answer
          </button>
          <button className="btn btn-success" type="button" onClick={startCall} disabled={!isConfigured || !isChannelReady}>
            Start Call
          </button>
          <button className="btn btn-ghost" type="button" onClick={toggleAudio} disabled={!localStream}>
            {audioMuted ? 'Mic Off' : 'Mic On'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={toggleVideo} disabled={!localStream}>
            {videoOff ? 'Cam Off' : 'Cam On'}
          </button>
          <button className="btn btn-danger" type="button" onClick={handleLeaveRoom}>
            End Call
          </button>
        </div>
      </main>
    </div>
  );
}
