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
  const signalingWs = useRef<WebSocket | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const clientId = useRef<string>(Math.random().toString(36).substr(2, 9));

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

  const initializeSignaling = async (): Promise<void> => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/twilio/webrtc/signaling/${clientId.current}`;
      
      signalingWs.current = new WebSocket(wsUrl);

      signalingWs.current.onopen = () => {
        console.log('[WebRTC-Browser] Signaling WebSocket připojen');
      };

      signalingWs.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebRTC-Browser] Signaling zpráva:', data.type);

          switch (data.type) {
            case 'call_started':
              console.log('[WebRTC-Browser] Hovor zahájen na serveru');
              break;
              
            case 'call_ended':
              console.log('[WebRTC-Browser] Hovor ukončen na serveru');
              setCallState(prev => ({ ...prev, status: 'disconnected' }));
              break;
              
            case 'audio_data':
              // Zpracování audio dat ze serveru
              handleServerAudio(data);
              break;
              
            case 'webrtc_offer':
              // Zpracování WebRTC offer
              await handleWebRTCOffer(data);
              break;
              
            case 'webrtc_answer':
              // Zpracování WebRTC answer
              await handleWebRTCAnswer(data);
              break;
              
            case 'ice_candidate':
              // Zpracování ICE candidate
              await handleICECandidate(data);
              break;
          }
        } catch (error) {
          console.error('[WebRTC-Browser] Chyba při zpracování signaling zprávy:', error);
        }
      };

      signalingWs.current.onclose = () => {
        console.log('[WebRTC-Browser] Signaling WebSocket uzavřen');
      };

      signalingWs.current.onerror = (error) => {
        console.error('[WebRTC-Browser] Signaling WebSocket chyba:', error);
        onError?.('Chyba při připojení k signaling serveru');
      };

    } catch (error) {
      console.error('[WebRTC-Browser] Chyba při inicializaci signaling:', error);
      onError?.('Nepodařilo se připojit k signaling serveru');
    }
  };

  const initializeWebRTC = async (): Promise<void> => {
    try {
      // Získání přístupu k mikrofonu
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
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
        console.log('[WebRTC-Browser] Přijat remote track:', event.track.kind);
        if (event.track.kind === 'audio' && remoteAudio.current) {
          const remoteStream = new MediaStream([event.track]);
          remoteAudio.current.srcObject = remoteStream;
          remoteAudio.current.play().catch(console.error);
        }
      };

      // ICE candidate handling
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && signalingWs.current?.readyState === WebSocket.OPEN) {
          console.log('[WebRTC-Browser] Odesílám ICE candidate');
          signalingWs.current.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate
          }));
        }
      };

      // Connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        if (peerConnection.current) {
          console.log('[WebRTC-Browser] Connection state:', peerConnection.current.connectionState);
          
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
      console.error('[WebRTC-Browser] Chyba při inicializaci WebRTC:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: 'Nepodařilo se získat přístup k mikrofonu'
      }));
      onError?.('Nepodařilo se získat přístup k mikrofonu');
    }
  };

  const handleServerAudio = (audioData: any): void => {
    // Zpracování audio dat ze serveru (Twilio nebo OpenAI)
    console.log('[WebRTC-Browser] Audio data ze serveru:', audioData.dataType);
    
    // Zde by byla implementace pro zpracování audio dat
    // V reálné implementaci by se audio data přehrála nebo zpracovala
  };

  const handleWebRTCOffer = async (offerData: any): Promise<void> => {
    if (!peerConnection.current) return;
    
    try {
      await peerConnection.current.setRemoteDescription(offerData.offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      if (signalingWs.current?.readyState === WebSocket.OPEN) {
        signalingWs.current.send(JSON.stringify({
          type: 'webrtc_answer',
          answer: answer
        }));
      }
    } catch (error) {
      console.error('[WebRTC-Browser] Chyba při zpracování offer:', error);
    }
  };

  const handleWebRTCAnswer = async (answerData: any): Promise<void> => {
    if (!peerConnection.current) return;
    
    try {
      await peerConnection.current.setRemoteDescription(answerData.answer);
    } catch (error) {
      console.error('[WebRTC-Browser] Chyba při zpracování answer:', error);
    }
  };

  const handleICECandidate = async (candidateData: any): Promise<void> => {
    if (!peerConnection.current) return;
    
    try {
      await peerConnection.current.addIceCandidate(candidateData.candidate);
    } catch (error) {
      console.error('[WebRTC-Browser] Chyba při přidávání ICE candidate:', error);
    }
  };

  const startCall = async (): Promise<void> => {
    try {
      setCallState(prev => ({ ...prev, status: 'connecting' }));

      // Inicializace signaling
      await initializeSignaling();
      
      // Čekání na připojení signaling WebSocket
      await new Promise((resolve) => {
        const checkConnection = () => {
          if (signalingWs.current?.readyState === WebSocket.OPEN) {
            resolve(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });

      // Inicializace WebRTC
      await initializeWebRTC();

      if (!peerConnection.current) {
        throw new Error('Peer connection není inicializováno');
      }

      // Vytvoření offer pro WebRTC spojení
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true
      });

      await peerConnection.current.setLocalDescription(offer);

      // Odeslání offer přes signaling
      if (signalingWs.current?.readyState === WebSocket.OPEN) {
        signalingWs.current.send(JSON.stringify({
          type: 'webrtc_offer',
          offer: offer
        }));
      }

      const callId = `webrtc-${Date.now()}`;
      setCallState(prev => ({
        ...prev,
        callId: callId,
        status: 'connecting'
      }));
      onCallStart?.(callId);

    } catch (error) {
      console.error('[WebRTC-Browser] Chyba při zahájení hovoru:', error);
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
        onCallEnd?.(callState.callId);
      }

      // Uzavření signaling WebSocket
      if (signalingWs.current) {
        signalingWs.current.close();
        signalingWs.current = null;
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
      console.error('[WebRTC-Browser] Chyba při ukončování hovoru:', error);
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
            {callState.status === 'idle' && 'Klikněte na tlačítko pro zahájení WebRTC hovoru s AI asistentem'}
            {callState.status === 'connecting' && 'Připojuji k AI asistentovi přes WebRTC...'}
            {callState.status === 'connected' && 'WebRTC hovor s AI asistentem aktivní'}
            {callState.status === 'disconnected' && 'WebRTC hovor byl ukončen'}
          </small>
        </div>

        <div className="mt-3">
          <small className="text-muted">
            Client ID: {clientId.current}
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