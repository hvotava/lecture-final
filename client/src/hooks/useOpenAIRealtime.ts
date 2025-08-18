import { useState, useRef, useCallback } from 'react';

interface OpenAISession {
  id: string;
  client_secret: {
    value: string;
    expires_at: string;
  };
}

interface UseOpenAIRealtimeOptions {
  backendUrl?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

interface UseOpenAIRealtimeReturn {
  isConnected: boolean;
  isConnecting: boolean;
  audioLevel: number;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useOpenAIRealtime(options: UseOpenAIRealtimeOptions = {}): UseOpenAIRealtimeReturn {
  const {
    backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080',
    onError,
    onStatusChange
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();

  /**
   * Vytvoří ephemeral session přes backend
   */
  const createSession = async (): Promise<OpenAISession> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const response = await fetch(`${backendUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId
      },
      body: JSON.stringify({
        voice: 'alloy',
        temperature: 0.8,
        instructions: 'Jsi AI učitel pro české firemní školení. Veď interaktivní konverzaci.'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.session;
  };

  /**
   * Nastavení audio level monitoring
   */
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.warn('Audio analyser setup failed:', error);
    }
  }, []);

  /**
   * Spustí WebRTC konverzaci
   */
  const start = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      onStatusChange?.('Connecting...');

      console.log('🚀 Starting OpenAI Realtime WebRTC...');

      // 1. Vytvoř ephemeral session
      console.log('🔑 Creating session...');
      const session = await createSession();
      console.log('✅ Session created:', session.id);

      // 2. Získej user media (mikrofon)
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });
      
      localStreamRef.current = stream;
      setupAudioAnalyser(stream);
      console.log('✅ Microphone access granted');

      // 3. Vytvoř RTCPeerConnection
      console.log('🔗 Creating peer connection...');
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      // 4. Přidej local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 5. Vytvoř data channel pro events
      const dataChannel = pc.createDataChannel('oai-events', {
        ordered: true
      });
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('📡 Data channel opened');
      };

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Data channel message:', data);
        } catch (error) {
          console.warn('Failed to parse data channel message:', error);
        }
      };

      // 6. Handle remote stream
      pc.ontrack = (event) => {
        console.log('🔊 Remote track received');
        const [remoteStream] = event.streams;
        
        // Vytvoř nebo aktualizuj audio element
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        
        remoteAudioRef.current.srcObject = remoteStream;
      };

      // 7. Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        
        switch (pc.iceConnectionState) {
          case 'connected':
          case 'completed':
            setIsConnected(true);
            setIsConnecting(false);
            onStatusChange?.('Connected');
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            setIsConnected(false);
            setError('Connection failed');
            onError?.('WebRTC connection failed');
            break;
        }
      };

      // 8. Vytvoř offer
      console.log('📝 Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set');

      // 9. Pošli offer do OpenAI Realtime
      console.log('📡 Sending offer to OpenAI...');
      const response = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.client_secret.value}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Realtime API error: ${response.status} ${errorText}`);
      }

      const answerSdp = await response.text();
      console.log('✅ Answer SDP received');

      // 10. Set remote description
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });
      console.log('✅ Remote description set');

      console.log('🎉 WebRTC connection established!');

    } catch (error) {
      console.error('💥 WebRTC setup failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsConnecting(false);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
      
      // Cleanup on error
      stop();
    }
  }, [isConnecting, isConnected, backendUrl, onError, onStatusChange, createSession, setupAudioAnalyser]);

  /**
   * Zastaví WebRTC konverzaci
   */
  const stop = useCallback(() => {
    console.log('🛑 Stopping WebRTC connection...');

    // Stop audio analyser
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    // Reset data channel
    dataChannelRef.current = null;
    analyserRef.current = null;

    // Reset state
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
    setError(null);
    
    onStatusChange?.('Disconnected');
    console.log('✅ WebRTC connection stopped');
  }, [onStatusChange]);

  return {
    isConnected,
    isConnecting,
    audioLevel,
    start,
    stop,
    error
  };
} 