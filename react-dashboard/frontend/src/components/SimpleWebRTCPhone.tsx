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
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const websocket = useRef<WebSocket | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
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

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Konverze Float32Array na PCM16
  const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp hodnoty mezi -1 a 1, pak konvertuj na 16-bit integer
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return pcm16.buffer;
  };

  // Konverze PCM16 na base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const startCall = async (): Promise<void> => {
    try {
      console.log('[SimpleWebRTC] Spouštím hovor...');
      
      callId.current = `simple_${Date.now()}`;
      setCallState({
        status: 'connecting',
        callId: callId.current,
        duration: 0
      });

      // WebSocket připojení
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/webrtc/simple`;
      
      console.log('[SimpleWebRTC] Připojuji k:', wsUrl);
      websocket.current = new WebSocket(wsUrl);

      websocket.current.onopen = () => {
        console.log('[SimpleWebRTC] WebSocket připojen');
        setIsConnected(true);
        setCallState(prev => ({ ...prev, status: 'connected' }));
        onCallStart?.(callId.current);
        
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
            if (!speakerMuted) {
              playAudioDelta(data.delta);
            }
          } else if (data.type === 'session.created') {
            console.log('[SimpleWebRTC] OpenAI session vytvořena');
            // Spustíme nahrávání až po vytvoření session
            startAudioRecording();
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
      // Separate output AudioContext to prevent feedback
      if (!outputAudioContext.current) {
        outputAudioContext.current = new AudioContext({ sampleRate: 24000 });
        
        // Create gain node for speaker volume control
        gainNode.current = outputAudioContext.current.createGain();
        gainNode.current.connect(outputAudioContext.current.destination);
      }

      // Dekódování base64 PCM16 dat
      const binaryData = atob(audioData);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      // Konverze PCM16 na Float32 pro Web Audio API
      const pcm16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(pcm16Array.length);
      
      for (let i = 0; i < pcm16Array.length; i++) {
        float32Array[i] = pcm16Array[i] / 32768.0; // Normalizace na -1 až 1
      }

      // Vytvoření audio buffer
      const audioBuffer = outputAudioContext.current.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      // Přehrání přes gain node (ne přímo na destination)
      const source = outputAudioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode.current!);
      source.start();
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při přehrávání audio:', error);
    }
  };

  const startAudioRecording = async (): Promise<void> => {
    try {
      console.log('[SimpleWebRTC] Spouštím nahrávání audio...');
      
      // Získání mikrofonu s přesnou konfigurací pro OpenAI a echo cancellation
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
          // Advanced echo cancellation settings
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false
        } as any
      });

      // Separate input AudioContext for recording
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });

      const source = inputAudioContext.current.createMediaStreamSource(mediaStream.current);
      
      // ScriptProcessorNode pro real-time audio processing
      processor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
      
      processor.current.onaudioprocess = (event) => {
        if (isMuted || !websocket.current || websocket.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Simple noise gate to prevent low-level feedback
        const rms = Math.sqrt(inputData.reduce((sum, sample) => sum + sample * sample, 0) / inputData.length);
        if (rms < 0.01) { // Threshold for noise gate
          return;
        }
        
        // Konverze na PCM16
        const pcm16Buffer = float32ToPCM16(inputData);
        const base64Audio = arrayBufferToBase64(pcm16Buffer);
        
        // Odeslání na server
        websocket.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      };

      // Připojení audio pipeline (bez connection na destination!)
      source.connect(processor.current);
      // IMPORTANT: Don't connect processor to destination to prevent feedback
      
      console.log('[SimpleWebRTC] Audio nahrávání spuštěno (24kHz, mono, PCM16) s echo cancellation');
      
    } catch (error) {
      console.error('[SimpleWebRTC] Chyba při spuštění nahrávání:', error);
      onError?.('Chyba při přístupu k mikrofonu');
    }
  };

  const endCall = (): void => {
    console.log('[SimpleWebRTC] Ukončujem hovor...');
    
    // Zastavení audio processing
    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }

    // Zastavení media stream
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    // Uzavření AudioContexts
    if (inputAudioContext.current) {
      inputAudioContext.current.close();
      inputAudioContext.current = null;
    }

    if (outputAudioContext.current) {
      outputAudioContext.current.close();
      outputAudioContext.current = null;
    }

    gainNode.current = null;

    // Uzavření WebSocket
    if (websocket.current) {
      websocket.current.close();
      websocket.current = null;
    }

    setIsConnected(false);
    setCallState({
      status: 'idle',
      duration: 0
    });

    onCallEnd?.(callId.current);
  };

  const toggleMute = (): void => {
    setIsMuted(!isMuted);
    console.log('[SimpleWebRTC] Mikrofon mute:', !isMuted);
  };

  const toggleSpeaker = (): void => {
    setSpeakerMuted(!speakerMuted);
    if (gainNode.current) {
      gainNode.current.gain.value = speakerMuted ? 1.0 : 0.0;
    }
    console.log('[SimpleWebRTC] Reproduktor mute:', !speakerMuted);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    switch (callState.status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'danger';
      case 'disconnected': return 'secondary';
      default: return 'primary';
    }
  };

  const getStatusText = (): string => {
    switch (callState.status) {
      case 'idle': return 'Připraven';
      case 'connecting': return 'Připojuji...';
      case 'connected': return 'Připojen';
      case 'disconnected': return 'Odpojeno';
      case 'error': return 'Chyba';
      default: return 'Neznámý stav';
    }
  };

  return (
    <div className="simple-webrtc-phone">
      <Card className="shadow-lg border-0">
        <Card.Header className="bg-gradient-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <Phone className="me-2" size={20} />
              AI Asistent - Telefon
            </h5>
            <Badge bg={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </Card.Header>

        <Card.Body className="text-center p-4">
          {callState.status === 'error' && callState.error && (
            <Alert variant="danger" className="mb-3">
              <strong>Chyba:</strong> {callState.error}
            </Alert>
          )}

          {callState.status === 'connected' && (
            <div className="mb-3">
              <div className="display-6 text-primary fw-bold">
                {formatDuration(callState.duration)}
              </div>
              <small className="text-muted">Délka hovoru</small>
            </div>
          )}

          {callState.status === 'connecting' && (
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Připojuji...</span>
              </div>
              <div className="mt-2 text-muted">Navazuji spojení s AI asistentem...</div>
            </div>
          )}

          <div className="d-flex justify-content-center gap-3">
            {callState.status === 'idle' || callState.status === 'error' || callState.status === 'disconnected' ? (
              <Button
                variant="success"
                size="lg"
                className="rounded-circle p-3"
                onClick={startCall}
                style={{ width: '80px', height: '80px' }}
              >
                <Phone size={32} />
              </Button>
            ) : (
              <>
                <Button
                  variant="danger"
                  size="lg"
                  className="rounded-circle p-3"
                  onClick={endCall}
                  style={{ width: '80px', height: '80px' }}
                >
                  <PhoneOff size={32} />
                </Button>

                <Button
                  variant={isMuted ? 'warning' : 'secondary'}
                  size="lg"
                  className="rounded-circle p-3"
                  onClick={toggleMute}
                  style={{ width: '60px', height: '60px' }}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </Button>

                <Button
                  variant={speakerMuted ? 'warning' : 'secondary'}
                  size="lg"
                  className="rounded-circle p-3"
                  onClick={toggleSpeaker}
                  style={{ width: '60px', height: '60px' }}
                >
                  {speakerMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </Button>
              </>
            )}
          </div>

          {callState.status === 'connected' && (
            <div className="mt-3">
              <small className="text-muted d-block">
                {isConnected ? (
                  <span className="text-success">
                    <span className="badge bg-success rounded-pill me-1">●</span>
                    Připojen k AI asistentovi
                  </span>
                ) : (
                  <span className="text-warning">
                    <span className="badge bg-warning rounded-pill me-1">●</span>
                    Připojuji...
                  </span>
                )}
              </small>
              <div className="mt-2 d-flex justify-content-center gap-3">
                {isMuted && (
                  <small className="text-warning">
                    <MicOff size={14} className="me-1" />
                    Mikrofon ztlumen
                  </small>
                )}
                {speakerMuted && (
                  <small className="text-warning">
                    <VolumeX size={14} className="me-1" />
                    Reproduktor ztlumen
                  </small>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default SimpleWebRTCPhone; 