'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createWebRTCPeer,
  getUserMediaStream,
  setAudioEnabled,
  setVideoEnabled,
  stopMediaStream,
} from '@/lib/webrtc';
import { v4 } from '@/lib/uuid';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { HAS_SUPABASE_CONFIG } from '@/lib/runtime';

const RECONNECT_DELAY_MS = 1500;

export function useVideoRoom(roomId) {
  const supabase = getSupabaseBrowserClient();
  const senderIdRef = useRef(v4());
  const channelRef = useRef(null);
  const peerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const manualDisconnectRef = useRef(false);
  const channelStatusRef = useRef('idle');
  const mountedRef = useRef(false);
  const localStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [channelState, setChannelState] = useState('idle');
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState('');

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const setNextChannelState = useCallback((nextState) => {
    channelStatusRef.current = nextState;
    setChannelState(nextState);
  }, []);

  const cleanupPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  const cleanupLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setAudioMuted(false);
    setVideoOff(false);
  }, []);

  const sendSignal = useCallback(async (type, data) => {
    if (!channelRef.current || channelStatusRef.current !== 'subscribed') {
      throw new Error('Room channel is not connected');
    }

    const result = await channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        type,
        data,
        senderId: senderIdRef.current,
      },
    });

    if (result !== 'ok') {
      throw new Error(`Failed to send ${type} signal`);
    }
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await getUserMediaStream();
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const ensurePeer = useCallback(
    async ({ reset = false } = {}) => {
      if (reset) {
        cleanupPeer();
      }

      if (peerRef.current) {
        return peerRef.current;
      }

      const stream = await ensureLocalStream();

      const peer = createWebRTCPeer({
        localStream: stream,
        onIceCandidate: (candidate) => {
          sendSignal('ice-candidate', candidate).catch((signalError) => {
            console.error('[VideoRoom] Failed to broadcast ICE candidate', signalError);
          });
        },
        onRemoteStream: (nextRemoteStream) => {
          setRemoteStream(nextRemoteStream);
          setCallState('connected');
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setCallState('connected');
          }

          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setCallState('ended');
          }
        },
      });

      peerRef.current = peer;
      return peer;
    },
    [cleanupPeer, ensureLocalStream, sendSignal]
  );

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || payload.senderId === senderIdRef.current) {
        return;
      }

      try {
        if (payload.type === 'offer') {
          const peer = await ensurePeer();
          setCallState('answering');
          await peer.setRemoteOffer(payload.data);
          const answer = await peer.createAnswer();
          await sendSignal('answer', answer);
          setCallState('connected');
          return;
        }

        if (payload.type === 'answer' && peerRef.current) {
          await peerRef.current.setRemoteAnswer(payload.data);
          setCallState('connected');
          return;
        }

        if (payload.type === 'ice-candidate') {
          if (!peerRef.current) {
            const peer = await ensurePeer();
            await peer.addIceCandidate(payload.data);
            return;
          }

          await peerRef.current.addIceCandidate(payload.data);
        }
      } catch (signalError) {
        console.error('[VideoRoom] Failed handling signal', signalError);
        setError(signalError.message || 'Realtime signaling failed');
        setCallState('error');
      }
    },
    [ensurePeer, sendSignal]
  );

  const connectChannel = useCallback(() => {
    if (!supabase || !roomId) {
      return;
    }

    manualDisconnectRef.current = false;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setNextChannelState('connecting');

    const channel = supabase
      .channel(`video-room-${roomId}`, {
        config: {
          broadcast: { self: false, ack: true },
        },
      })
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignal(payload);
      });

    channel.subscribe((status) => {
      if (channelRef.current !== channel) {
        return;
      }

      const nextStatus = status.toLowerCase();
      setNextChannelState(nextStatus);

      if (status === 'SUBSCRIBED') {
        clearReconnectTimer();
        return;
      }

      if (
        (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') &&
        mountedRef.current &&
        !manualDisconnectRef.current
      ) {
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          connectChannel();
        }, RECONNECT_DELAY_MS);
      }
    });

    channelRef.current = channel;
  }, [clearReconnectTimer, handleSignal, roomId, setNextChannelState, supabase]);

  useEffect(() => {
    mountedRef.current = true;
    manualDisconnectRef.current = false;

    if (HAS_SUPABASE_CONFIG && roomId) {
      connectChannel();
    }

    return () => {
      mountedRef.current = false;
      manualDisconnectRef.current = true;
      clearReconnectTimer();
      cleanupPeer();
      cleanupLocalStream();

      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [cleanupLocalStream, cleanupPeer, clearReconnectTimer, connectChannel, roomId, supabase]);

  const joinCall = useCallback(async () => {
    if (!HAS_SUPABASE_CONFIG) {
      setError('Supabase is not configured for realtime signaling.');
      return;
    }

    if (channelStatusRef.current !== 'subscribed') {
      setError('Room is still connecting. Wait for the channel to say subscribed.');
      return;
    }

    try {
      setError('');
      await ensureLocalStream();
      await ensurePeer();
      setCallState((current) => (current === 'connected' ? current : 'joined'));
    } catch (joinError) {
      console.error('[VideoRoom] Failed to join call', joinError);
      setError(joinError.message || 'Unable to access camera or microphone.');
      setCallState('error');
    }
  }, [ensureLocalStream, ensurePeer]);

  const startCall = useCallback(async () => {
    if (!HAS_SUPABASE_CONFIG) {
      setError('Supabase is not configured for realtime signaling.');
      return;
    }

    if (channelStatusRef.current !== 'subscribed') {
      setError('Room is still connecting. Wait for the channel to say subscribed.');
      return;
    }

    try {
      setError('');
      setCallState('calling');

      const peer = await ensurePeer({ reset: true });
      const offer = await peer.createOffer();
      await sendSignal('offer', offer);
    } catch (startError) {
      console.error('[VideoRoom] Failed to start call', startError);
      setError(startError.message || 'Unable to start the call.');
      setCallState('error');
    }
  }, [ensurePeer, sendSignal]);

  const endCall = useCallback(async () => {
    try {
      manualDisconnectRef.current = true;
      clearReconnectTimer();
      cleanupPeer();
      cleanupLocalStream();
      setCallState('ended');
      setNextChannelState('closed');

      if (channelRef.current && supabase) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    } catch (endError) {
      console.error('[VideoRoom] Failed to end call cleanly', endError);
    }
  }, [cleanupLocalStream, cleanupPeer, clearReconnectTimer, setNextChannelState, supabase]);

  const toggleAudio = useCallback(() => {
    const nextMuted = !audioMuted;
    setAudioEnabled(localStreamRef.current, !nextMuted);
    setAudioMuted(nextMuted);
  }, [audioMuted]);

  const toggleVideo = useCallback(() => {
    const nextVideoOff = !videoOff;
    setVideoEnabled(localStreamRef.current, !nextVideoOff);
    setVideoOff(nextVideoOff);
  }, [videoOff]);

  return {
    channelState,
    isChannelReady: channelState === 'subscribed',
    callState,
    localStream,
    remoteStream,
    audioMuted,
    videoOff,
    error,
    isConfigured: HAS_SUPABASE_CONFIG,
    joinCall,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
}
