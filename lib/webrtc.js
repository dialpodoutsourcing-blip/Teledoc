const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export async function getUserMediaStream() {
  return navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: true,
  });
}

export function stopMediaStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

export function setAudioEnabled(stream, enabled) {
  if (!stream) {
    return;
  }

  stream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function setVideoEnabled(stream, enabled) {
  if (!stream) {
    return;
  }

  stream.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function createWebRTCPeer({ localStream, onIceCandidate, onRemoteStream, onConnectionStateChange }) {
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);
  const queuedCandidates = [];

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    if (onRemoteStream && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (onConnectionStateChange) {
      onConnectionStateChange(peerConnection.connectionState);
    }
  };

  const flushQueuedCandidates = async () => {
    if (!peerConnection.remoteDescription) {
      return;
    }

    while (queuedCandidates.length > 0) {
      const candidate = queuedCandidates.shift();
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTC] Failed to flush queued ICE candidate', error);
      }
    }
  };

  return {
    peerConnection,
    async createOffer() {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      return offer;
    },
    async setRemoteOffer(offer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await flushQueuedCandidates();
    },
    async createAnswer() {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      return answer;
    },
    async setRemoteAnswer(answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await flushQueuedCandidates();
    },
    async addIceCandidate(candidate) {
      if (!candidate) {
        return;
      }

      if (!peerConnection.remoteDescription) {
        queuedCandidates.push(candidate);
        return;
      }

      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    },
    close() {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      if (peerConnection.signalingState !== 'closed') {
        peerConnection.close();
      }
    },
  };
}
