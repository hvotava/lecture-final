import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Alert, Badge } from 'react-bootstrap';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface WebRTCPhoneProps {
  userId: string;
  onCallStart?: (callId: string) => void;
  onCallEnd?: (callId: string) => void;
  onError?: (error: string) => void;
}

interface CallState {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  callId?: string;
  duration: number;
  error?: string;
}

const WebRTCPhone: React.FC<WebRTCPhoneProps> = ({
  userId,
  onCallStart,
  onCallEnd,
  onError
}) => {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    duration: 0
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // WebRTC konfigurace
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // Cleanup při unmount
    return () => {
      hangUp();
    };
  }, []);

  // Timer pro délku hovoru
  useEffect(() => {
    if (callState.status === 'connected') {
      durationInterval.current = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callState.status]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initializeWebRTC = async (): Promise<void> => {
    try {
      // Získání přístupu k mikrofonu
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // Vytvoření peer connection
      peerConnection.current = new RTCPeerConnection(rtcConfig);

      // Přidání local stream
      localStream.current.getTracks().forEach(track => {
        if (peerConnection.current && localStream.current) {
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      // Zpracování remote stream
      peerConnection.current.ontrack = (event) => {
        console.log('Přijat remote track:', event.track.kind);
        if (event.track.kind === 'audio' && remoteAudio.current) {
          const remoteStream = new MediaStream([event.track]);
          remoteAudio.current.srcObject = remoteStream;
          remoteAudio.current.play().catch(console.error);
        }
      };

      // ICE candidate handling
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Nový ICE candidate:', event.candidate);
          sendIceCandidate(event.candidate);
        }
      };

      // Connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        if (peerConnection.current) {
          console.log('WebRTC connection state:', peerConnection.current.connectionState);
          
          switch (peerConnection.current.connectionState) {
            case 'connected':
              setCallState(prev => ({ ...prev, status: 'connected' }));
              break;
            case 'disconnected':
            case 'failed':
            case 'closed':
              setCallState(prev => ({ ...prev, status: 'disconnected' }));
              break;
          }
        }
      };

    } catch (error) {
      console.error('Chyba při inicializaci WebRTC:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Nepodařilo se získat přístup k mikrofonu'
      }));
      onError?.('Nepodařilo se získat přístup k mikrofonu');
    }
  };

  const startCall = async (): Promise<void> => {
    try {
      setCallState(prev => ({ ...prev, status: 'connecting' }));

      await initializeWebRTC();

      if (!peerConnection.current) {
        throw new Error('Peer connection není inicializováno');
      }

      // Vytvoření offer
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true
      });

      await peerConnection.current.setLocalDescription(offer);

      // Odeslání offer na server
      const response = await fetch('/api/twilio/webrtc/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          offer: {
            type: offer.type,
            sdp: offer.sdp
          }
        })
      });

      if (!response.ok) {
        throw new Error('Chyba při vytváření hovoru');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setCallState(prev => ({
          ...prev,
          callId: data.callId,
          status: 'connecting'
        }));
        onCallStart?.(data.callId);
      } else {
        throw new Error(data.message || 'Chyba při vytváření hovoru');
      }

    } catch (error) {
      console.error('Chyba při zahájení hovoru:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      }));
      onError?.(error instanceof Error ? error.message : 'Neznámá chyba');
    }
  };

  const hangUp = async (): Promise<void> => {
    try {
      if (callState.callId) {
        // Oznámení serveru o ukončení hovoru
        await fetch('/api/twilio/webrtc/hangup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            callId: callState.callId
          })
        });

        onCallEnd?.(callState.callId);
      }

      // Uzavření peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // Zastavení local stream
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
        localStream.current = null;
      }

      // Reset stavu
      setCallState({
        status: 'idle',
        duration: 0
      });

      setIsMuted(false);
      setIsSpeakerOn(true);

    } catch (error) {
      console.error('Chyba při ukončování hovoru:', error);
    }
  };

  const sendIceCandidate = async (candidate: RTCIceCandidate): Promise<void> => {
    if (!callState.callId) return;

    try {
      await fetch('/api/twilio/webrtc/ice-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callId: callState.callId,
          candidate: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
          }
        })
      });
    } catch (error) {
      console.error('Chyba při odesílání ICE candidate:', error);
    }
  };

  const toggleMute = (): void => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = (): void => {
    if (remoteAudio.current) {
      remoteAudio.current.muted = !remoteAudio.current.muted;
      setIsSpeakerOn(!remoteAudio.current.muted);
    }
  };

  const getStatusColor = (): string => {
    switch (callState.status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (): string => {
    switch (callState.status) {
      case 'idle': return 'Připraven';
      case 'connecting': return 'Připojuji...';
      case 'connected': return `Připojen (${formatDuration(callState.duration)})`;
      case 'disconnected': return 'Odpojeno';
      case 'error': return 'Chyba';
      default: return 'Neznámý stav';
    }
  };

  return (
    <Card className="webrtc-phone">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">WebRTC Telefon</h5>
          <Badge bg={getStatusColor()}>{getStatusText()}</Badge>
        </div>
      </Card.Header>

      <Card.Body>
        {callState.error && (
          <Alert variant="danger" className="mb-3">
            {callState.error}
          </Alert>
        )}

        <div className="text-center mb-3">
          {callState.status === 'idle' && (
            <Button
              variant="success"
              size="lg"
              onClick={startCall}
              className="rounded-circle p-3"
            >
              <Phone size={24} />
            </Button>
          )}

          {(callState.status === 'connecting' || callState.status === 'connected') && (
            <div className="d-flex justify-content-center gap-3">
              <Button
                variant={isMuted ? 'warning' : 'secondary'}
                onClick={toggleMute}
                className="rounded-circle p-3"
                disabled={callState.status !== 'connected'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>

              <Button
                variant="danger"
                size="lg"
                onClick={hangUp}
                className="rounded-circle p-3"
              >
                <PhoneOff size={24} />
              </Button>

              <Button
                variant={isSpeakerOn ? 'secondary' : 'warning'}
                onClick={toggleSpeaker}
                className="rounded-circle p-3"
                disabled={callState.status !== 'connected'}
              >
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </Button>
            </div>
          )}
        </div>

        <div className="text-center text-muted">
          <small>
            {callState.status === 'idle' && 'Klikněte na tlačítko pro zahájení hovoru s AI asistentem'}
            {callState.status === 'connecting' && 'Připojuji k AI asistentovi...'}
            {callState.status === 'connected' && 'Mluvte s AI asistentem přes WebRTC'}
            {callState.status === 'disconnected' && 'Hovor byl ukončen'}
          </small>
        </div>
      </Card.Body>

      {/* Hidden audio element pro remote stream */}
      <audio
        ref={remoteAudio}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </Card>
  );
};

export default WebRTCPhone; 