/** WebRTC peer connection manager */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let peerConnection = null;
let localStream = null;

export function getLocalStream() {
  return localStream;
}

export async function initLocalStream(videoEl) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: true,
    });
    if (videoEl) {
      videoEl.srcObject = localStream;
    }
    return localStream;
  } catch (err) {
    console.error('[WebRTC] Failed to get media:', err);
    throw err;
  }
}

export function createPeerConnection(onIceCandidate, onRemoteStream, onConnectionStateChange) {
  peerConnection = new RTCPeerConnection(ICE_SERVERS);

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

  return peerConnection;
}

export async function createOffer() {
  if (!peerConnection) return null;
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

export async function handleOffer(offer) {
  if (!peerConnection) return null;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

export async function handleAnswer(answer) {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function addIceCandidate(candidate) {
  if (!peerConnection) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error('[WebRTC] ICE candidate error:', err);
  }
}

export function toggleAudio(enabled) {
  if (!localStream) return;
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function toggleVideo(enabled) {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function closeConnection() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}
