'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 } from '@/lib/uuid';
import { HAS_SUPABASE_CONFIG } from '@/lib/runtime';

function createRoomId() {
  return `demo-${v4().split('-')[0]}`;
}

export default function VideoDemoLauncher() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    router.push(`/consultation/${createRoomId()}`);
  };

  const handleJoinRoom = (event) => {
    event.preventDefault();

    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      return;
    }

    router.push(`/consultation/${encodeURIComponent(trimmedRoomId)}`);
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
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use the video demo.
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
