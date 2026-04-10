import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from '../utils/uuid';
import { HAS_SUPABASE_CONFIG } from '../config/runtime';

function createRoomId() {
  return `demo-${v4().split('-')[0]}`;
}

export default function VideoDemoLauncher() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    navigate(`/consultation/${createRoomId()}`);
  };

  const handleJoinRoom = (event) => {
    event.preventDefault();

    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      return;
    }

    navigate(`/consultation/${encodeURIComponent(trimmedRoomId)}`);
  };

  return (
    <div className="card video-demo-launcher">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <div className="section-title">1-on-1 Video Demo</div>
          <div className="page-subtitle" style={{ marginTop: 4 }}>
            Create a room or join an existing room ID to test WebRTC with Supabase Realtime signaling.
          </div>
        </div>
      </div>

      {!HAS_SUPABASE_CONFIG && (
        <div className="realtime-notice" style={{ marginBottom: 16 }}>
          <div className="realtime-notice-title">Supabase not configured</div>
          <div className="realtime-notice-body">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use the video demo.
          </div>
        </div>
      )}

      <div className="video-demo-actions">
        <button className="btn btn-primary" type="button" onClick={handleCreateRoom} disabled={!HAS_SUPABASE_CONFIG}>
          Create Room
        </button>

        <form className="video-demo-join" onSubmit={handleJoinRoom}>
          <input
            className="form-input"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            placeholder="Enter room ID"
          />
          <button className="btn btn-ghost" type="submit" disabled={!HAS_SUPABASE_CONFIG || !roomId.trim()}>
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
