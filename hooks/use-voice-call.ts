/**
 * useVoiceCall — WebRTC in-app voice calling for HY3N (React Native)
 *
 * Ported from the web app's useVoiceCall.js
 * Signaling via Firestore "ride_calls/{rideId}"
 * Audio via react-native-webrtc peer-to-peer (no phone network minutes)
 *
 * Flow:
 *   Caller:  startCall(calleeId)
 *            → creates doc with offer + status:"calling"
 *            → listens for answer + callee ICE
 *   Callee:  idle listener sees status:"calling" + callee_id===myId
 *            → shows IncomingCallModal (isIncoming=true, status="ringing")
 *            → acceptCall() sets up PC, processes offer, writes answer
 *            → both exchange ICE via arrayUnion
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { firestoreDB } from '@/lib/firebase';

// Lazy-load react-native-webrtc only on native (not web)
let RTCPeerConnection: any = null;
let RTCSessionDescription: any = null;
let RTCIceCandidate: any = null;
let mediaDevices: any = null;

if (Platform.OS !== 'web') {
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
  } catch {}
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'answering' | 'active' | 'ended';

export interface VoiceCallHook {
  status: CallStatus;
  isIncoming: boolean;
  isMuted: boolean;
  isSpeaker: boolean;
  duration: number;
  formattedDuration: string;
  callerName: string;
  callError: string | null;
  startCall: (calleeId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

export function useVoiceCall({
  rideId,
  myId,
  myName,
  myRole,
  otherName,
}: {
  rideId?: string;
  myId?: string;
  myName?: string;
  myRole?: string;
  otherName?: string;
}): VoiceCallHook {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callerName, setCallerName] = useState('');
  const [callError, setCallError] = useState<string | null>(null);

  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callUnsubRef = useRef<(() => void) | null>(null);
  const idleUnsubRef = useRef<(() => void) | null>(null);
  const callDocIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const statusRef = useRef<CallStatus>('idle');
  const appliedCalleeCands = useRef(0);
  const appliedCallerCands = useRef(0);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (rideId) callDocIdRef.current = rideId;
  }, [rideId]);

  useEffect(() => {
    return () => {
      _cleanup();
      if (idleUnsubRef.current) { idleUnsubRef.current(); idleUnsubRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _cleanup = () => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (callUnsubRef.current) { callUnsubRef.current(); callUnsubRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks?.().forEach((t: any) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    appliedCalleeCands.current = 0;
    appliedCallerCands.current = 0;
    isCallerRef.current = false;
  };

  const _getMic = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!mediaDevices) throw new Error('WebRTC not available on this platform');
    const stream = await mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  };

  const _applyNewCandidates = async (candidates: any[], countRef: React.MutableRefObject<number>) => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    const newOnes = candidates.slice(countRef.current);
    for (const c of newOnes) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    countRef.current = candidates.length;
  };

  const _handleEnded = useCallback(() => {
    _cleanup();
    setStatus('ended');
    setIsIncoming(false);
    setIsMuted(false);
    setTimeout(() => setStatus('idle'), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _createPC = useCallback((isCaller: boolean) => {
    if (!RTCPeerConnection) return null;
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    isCallerRef.current = isCaller;

    pc.ontrack = (e: any) => {
      // On React Native, remote audio plays automatically when track is added
    };

    pc.onicecandidate = async (e: any) => {
      if (!e.candidate || !callDocIdRef.current) return;
      const field = isCaller ? 'caller_candidates' : 'callee_candidates';
      try {
        const existing = await firestoreDB.get('ride_calls', callDocIdRef.current);
        const arr = existing?.[field] || [];
        await firestoreDB.update('ride_calls', callDocIdRef.current, {
          [field]: [...arr, e.candidate.toJSON()],
        });
      } catch {}
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('active');
        setDuration(0);
        durationTimerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        if (callDocIdRef.current) {
          firestoreDB.update('ride_calls', callDocIdRef.current, { status: 'active' }).catch(() => {});
        }
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) _handleEnded();
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce?.();
    };

    pcRef.current = pc;
    return pc;
  }, [_handleEnded]);

  const _subscribeCallDoc = useCallback(() => {
    if (!callDocIdRef.current) return;
    if (callUnsubRef.current) { callUnsubRef.current(); callUnsubRef.current = null; }

    callUnsubRef.current = firestoreDB.subscribeDoc('ride_calls', callDocIdRef.current, async (data: any) => {
      if (!data) {
        if (['active', 'calling', 'ringing'].includes(statusRef.current)) _handleEnded();
        return;
      }

      // Callee: process offer once PC is ready
      if (!isCallerRef.current && data.offer && pcRef.current && !pcRef.current.remoteDescription) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          await firestoreDB.update('ride_calls', callDocIdRef.current!, {
            answer: answer.toJSON(),
            status: 'answering',
          });
          await _applyNewCandidates(data.caller_candidates || [], appliedCallerCands);
        } catch (err) { console.error('[VoiceCall] Answer error:', err); }
      }

      // Caller: process answer
      if (isCallerRef.current && data.answer && pcRef.current && !pcRef.current.remoteDescription) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          await _applyNewCandidates(data.callee_candidates || [], appliedCalleeCands);
        } catch (err) { console.error('[VoiceCall] Set answer error:', err); }
      }

      // Both: apply new ICE from other side
      if (pcRef.current && pcRef.current.remoteDescription) {
        if (isCallerRef.current) {
          await _applyNewCandidates(data.callee_candidates || [], appliedCalleeCands);
        } else {
          await _applyNewCandidates(data.caller_candidates || [], appliedCallerCands);
        }
      }

      if (data.status === 'ended') _handleEnded();
    });
  }, [_handleEnded]);

  // Idle listener: watch for incoming calls
  useEffect(() => {
    if (!rideId || !myId) return;
    if (idleUnsubRef.current) { idleUnsubRef.current(); idleUnsubRef.current = null; }

    idleUnsubRef.current = firestoreDB.subscribeDoc('ride_calls', rideId, (data: any) => {
      if (!data) return;
      if (data.status === 'calling' && data.callee_id === myId && statusRef.current === 'idle') {
        setIsIncoming(true);
        setCallerName(data.caller_name || otherName || 'Unknown');
        setStatus('ringing');
        callDocIdRef.current = rideId;
        _subscribeCallDoc();
      }
    });

    return () => {
      if (idleUnsubRef.current) { idleUnsubRef.current(); idleUnsubRef.current = null; }
    };
  }, [rideId, myId, otherName, _subscribeCallDoc]);

  const startCall = useCallback(async (calleeId: string) => {
    if (!rideId || !myId || !calleeId) return;
    if (statusRef.current !== 'idle') return;
    if (!RTCPeerConnection) {
      setCallError('Voice calls are not available on this platform.');
      return;
    }
    setCallError(null);
    setStatus('calling');
    try {
      const stream = await _getMic();
      const pc = _createPC(true);
      if (!pc) throw new Error('Could not create peer connection');
      stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      callDocIdRef.current = rideId;
      await firestoreDB.create('ride_calls', {
        id: rideId,
        status: 'calling',
        caller_id: myId,
        caller_name: myName,
        caller_role: myRole,
        callee_id: calleeId,
        offer: offer.toJSON(),
        answer: null,
        caller_candidates: [],
        callee_candidates: [],
        created_at: new Date().toISOString(),
      });
      _subscribeCallDoc();
      setTimeout(() => {
        if (statusRef.current === 'calling' || statusRef.current === 'ringing') endCall();
      }, 30000);
    } catch (err: any) {
      console.error('[VoiceCall] startCall error:', err);
      setCallError('Could not start call. Check microphone permissions.');
      setStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, myId, myName, myRole, _createPC, _subscribeCallDoc]);

  const acceptCall = useCallback(async () => {
    if (statusRef.current !== 'ringing' || !callDocIdRef.current) return;
    try {
      const stream = await _getMic();
      const pc = _createPC(false);
      if (!pc) throw new Error('Could not create peer connection');
      stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
      _subscribeCallDoc();
    } catch (err) { console.error('[VoiceCall] acceptCall error:', err); }
  }, [_createPC, _subscribeCallDoc]);

  const endCall = useCallback(async () => {
    try {
      if (callDocIdRef.current) {
        const snap = await firestoreDB.get('ride_calls', callDocIdRef.current);
        if (snap) {
          await firestoreDB.update('ride_calls', callDocIdRef.current, {
            status: 'ended',
            ended_at: new Date().toISOString(),
          });
        }
      }
    } catch {}
    _handleEnded();
  }, [_handleEnded]);

  const declineCall = useCallback(async () => {
    try {
      if (callDocIdRef.current) {
        await firestoreDB.update('ride_calls', callDocIdRef.current, {
          status: 'ended',
          declined: true,
          ended_at: new Date().toISOString(),
        });
      }
    } catch {}
    _handleEnded();
  }, [_handleEnded]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks?.().forEach((t: any) => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(p => !p);
    // On React Native, speaker routing is handled by InCallManager or platform default
  }, []);

  const formattedDuration = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  return {
    status, isIncoming, isMuted, isSpeaker, duration, formattedDuration,
    callerName, callError,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleSpeaker,
  };
}
