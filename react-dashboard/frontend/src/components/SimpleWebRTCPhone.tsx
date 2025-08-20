import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Alert, Badge } from 'react-bootstrap';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface SimpleWebRTCPhoneProps {
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

const SimpleWebRTCPhone: React.FC<SimpleWebRTCPhoneProps> = ({
  onCallStart,
  onCallEnd,
  onError
}) => {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    duration: 0
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const websocket = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const callId = useRef<string>('');

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

  const connectToOpenAI = async (): Promise<void> => {
    try {
      console.log('[SimpleWebRTC] Připojuji se k OpenAI přes backend...');
      
      // Připojení na náš jednoduchý backend endpoint
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/webrtc/simple`;
      
      websocket.current = new WebSocket(wsUrl);

      websocket.current.onopen = () => {
        console.log('[SimpleWebRTC] WebSocket připojen k backend');
        setIsConnected(true);
        setCallState(prev => ({ ...prev, status: 'connected' }));
        
        // Pošleme session update pro nastavení češtiny
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'Jsi přátelský AI asistent. Komunikuj pouze v češtině. Buď nápomocný a odpovídej krátce a jasně.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        };
        
        websocket.current?.send(JSON.stringify(sessionUpdate));
        console.log('[SimpleWebRTC] Session update odesláno');
      };

      websocket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SimpleWebRTC] Zpráva z OpenAI:', data.type);
          
          if (data.type === 'response.audio.delta' && data.delta) {
            // Přehrání audio odpovědi z OpenAI
            playAudioDelta(data.delta);
          } else if (data.type === 'session.created') {
            console.log('[SimpleWebRTC] OpenAI session vytvořena');
          } else if (data.type === 'error') {
            console.error('[SimpleWebRTC] OpenAI error:', data);
            onError?.(`OpenAI chyba: ${data.error?.message || 'Neznámá chyba'}`);
          }
        } catch (error) {
          console.error('[SimpleWebRTC] Chyba při zpracování zprávy:', error);
        }
      };

      websocket.current.onclose = () => {
        console.log('[SimpleWebRTC] WebSocket uzavřen');
        setIsConnected(false);
        setCallState(prev => ({ ...prev, status: 'disconnected' }));
      };

      websocket.current.onerror = (error) => {
        console.error('[SimpleWebRTC] WebSocket chyba:', error);
        setCallState(prev => ({
          ...prev,
          status: 'error',
          error: 'Chyba připojení k serveru'
        }));
        onError?.('Chyba připojení k serveru');
      };

    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při připojování:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      }));
      onError?.(error instanceof Error ? error.message : 'Neznámá chyba');
    }
  };

  const playAudioDelta = async (audioData: string): Promise<void> => {
    try {
      if (!audioContext.current) {
        audioContext.current = new AudioContext();
      }

      // Dekódování base64 audio dat
      const binaryData = atob(audioData);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      // Přehrání audio
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);
      source.start();
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při přehrávání audio:', error);
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
          
          // Převod na PCM16 a odeslání na server
          event.data.arrayBuffer().then(buffer => {
            if (websocket.current?.readyState === WebSocket.OPEN) {
              // Pro jednoduchost pošleme jako base64
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                websocket.current?.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: base64
                }));
              };
              reader.readAsDataURL(new Blob([buffer]));
            }
          });
        }
      };

      mediaRecorder.current.start(100); // Každých 100ms
      console.log('[SimpleWebRTC] Nahrávání spuštěno');
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při spuštění nahrávání:', error);
      onError?.('Nepodařilo se získat přístup k mikrofonu');
    }
  };

  const stopRecording = (): void => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      console.log('[SimpleWebRTC] Nahrávání zastaveno');
    }
  };

  const startCall = async (): Promise<void> => {
    try {
      const newCallId = `simple-webrtc-${Date.now()}`;
      callId.current = newCallId;
      
      setCallState(prev => ({
        ...prev,
        status: 'connecting',
        callId: newCallId,
        duration: 0
      }));

      // Připojení k OpenAI
      await connectToOpenAI();
      
      // Spuštění nahrávání
      await startRecording();
      
      onCallStart?.(newCallId);
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při zahájení hovoru:', error);
      setCallState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      }));
      onError?.(error instanceof Error ? error.message : 'Neznámá chyba');
    }
  };

  const endCall = (): void => {
    try {
      // Zastavení nahrávání
      stopRecording();
      
      // Uzavření WebSocket
      if (websocket.current) {
        websocket.current.close();
        websocket.current = null;
      }
      
      // Uzavření AudioContext
      if (audioContext.current) {
        audioContext.current.close();
        audioContext.current = null;
      }
      
      setIsConnected(false);
      setCallState(prev => ({
        ...prev,
        status: 'idle',
        duration: 0
      }));
      
      if (callId.current) {
        onCallEnd?.(callId.current);
      }
      
      setIsMuted(false);
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při ukončování hovoru:', error);
    }
  };

  const toggleMute = (): void => {
    if (mediaRecorder.current) {
      if (isMuted) {
        mediaRecorder.current.resume();
      } else {
        mediaRecorder.current.pause();
      }
      setIsMuted(!isMuted);
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
    <Card className="simple-webrtc-phone">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">AI Asistent (WebRTC)</h5>
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
                onClick={endCall}
                className="rounded-circle p-3"
              >
                <PhoneOff size={24} />
              </Button>
            </div>
          )}
        </div>

        <div className="text-center text-muted">
          <small>
            {callState.status === 'idle' && 'Klikněte pro zahájení hovoru s AI asistentem'}
            {callState.status === 'connecting' && 'Připojuji k AI asistentovi...'}
            {callState.status === 'connected' && 'Hovor s AI asistentem aktivní - můžete mluvit'}
            {callState.status === 'disconnected' && 'Hovor byl ukončen'}
          </small>
        </div>

        {isConnected && (
          <div className="mt-3">
            <small className="text-success">
              ✓ Připojeno k OpenAI Realtime API
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SimpleWebRTCPhone; 