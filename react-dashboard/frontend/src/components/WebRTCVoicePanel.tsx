import React, { useState, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface OpenAISession {
  id: string;
  client_secret: {
    value: string;
    expires_at: string;
  };
}

interface WebRTCVoicePanelProps {
  userId?: number;
  userName?: string;
  backendUrl?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onCallStart?: () => void;
  onCallEnd?: () => void;
}

export const WebRTCVoicePanel: React.FC<WebRTCVoicePanelProps> = ({
  userId,
  userName,
  backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  onError,
  onStatusChange,
  onCallStart,
  onCallEnd
}) => {
  const theme = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();

  /**
   * Vytvoří ephemeral session
   */
  const createSession = async (): Promise<OpenAISession> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const response = await fetch(`${backendUrl}/api/webrtc/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId
      },
      body: JSON.stringify({
        voice: 'alloy',
        temperature: 0.8,
        instructions: `Jsi AI učitel pro české firemní školení. ${userName ? `Mluvíš s uživatelem ${userName}.` : ''} Veď interaktivní konverzaci.`
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
        setAudioLevel(average / 255);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.warn('Audio analyser setup failed:', error);
    }
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  }, []);

  /**
   * Spustí WebRTC konverzaci
   */
  const startCall = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      onStatusChange?.('Připojuji...');
      onCallStart?.();

      console.log('🚀 Starting WebRTC call...');

      // 1. Vytvoř session
      const session = await createSession();
      console.log('✅ Session created:', session.id);

      // 2. Získej mikrofon
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

      // 3. Vytvoř peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      // 4. Přidej stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 5. Data channel
      const dataChannel = pc.createDataChannel('oai-events', { ordered: true });
      dataChannelRef.current = dataChannel;

      // 6. Handle remote stream
      pc.ontrack = (event) => {
        console.log('🔊 Remote track received');
        const [remoteStream] = event.streams;
        
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        
        remoteAudioRef.current.srcObject = remoteStream;
      };

      // 7. Connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE state:', pc.iceConnectionState);
        
        switch (pc.iceConnectionState) {
          case 'connected':
          case 'completed':
            setIsConnected(true);
            setIsConnecting(false);
            onStatusChange?.('Připojeno');
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            setIsConnected(false);
            setError('Spojení selhalo');
            onError?.('WebRTC connection failed');
            break;
        }
      };

      // 8. Vytvoř offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);

      // 9. Pošli do OpenAI
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
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const answerSdp = await response.text();
      
      // 10. Set remote description
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      console.log('🎉 WebRTC connected!');

    } catch (error) {
      console.error('💥 WebRTC failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(errorMessage);
      stopCall();
    }
  }, [isConnecting, isConnected, backendUrl, userName, onError, onStatusChange, onCallStart, setupAudioAnalyser]);

  /**
   * Zastaví konverzaci
   */
  const stopCall = useCallback(() => {
    console.log('🛑 Stopping WebRTC call...');

    // Stop analyser
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
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

    // Reset refs
    dataChannelRef.current = null;
    analyserRef.current = null;

    // Reset state
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
    setIsMuted(false);
    setError(null);
    
    onStatusChange?.('Odpojeno');
    onCallEnd?.();
  }, [onStatusChange, onCallEnd]);

  const getStatusChip = () => {
    if (error) {
      return <Chip label="Chyba" color="error" size="small" />;
    }
    if (isConnected) {
      return <Chip label="Připojeno" color="success" size="small" />;
    }
    if (isConnecting) {
      return <Chip label="Připojuji..." color="warning" size="small" />;
    }
    return <Chip label="Odpojeno" color="default" size="small" />;
  };

  return (
    <Card sx={{ maxWidth: 400, mx: 'auto' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎙️ AI Hlasový Asistent
          </Typography>
          {userName && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Hovor s {userName}
            </Typography>
          )}
          {getStatusChip()}
        </Box>

        {/* Audio Level */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Úroveň audia
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={audioLevel * 100}
            sx={{ 
              height: 8, 
              borderRadius: 1,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: audioLevel > 0.7 ? theme.palette.error.main :
                               audioLevel > 0.4 ? theme.palette.warning.main :
                               theme.palette.success.main
              }
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round(audioLevel * 100)}%
          </Typography>
        </Box>

        {/* Main Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
          {!isConnected && !isConnecting && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PhoneIcon />}
              onClick={startCall}
              sx={{ 
                borderRadius: '50px',
                px: 4,
                py: 1.5,
                backgroundColor: theme.palette.success.main,
                '&:hover': {
                  backgroundColor: theme.palette.success.dark,
                }
              }}
            >
              Spustit hovor
            </Button>
          )}

          {isConnecting && (
            <Button
              variant="contained"
              size="large"
              disabled
              startIcon={<CircularProgress size={20} />}
              sx={{ borderRadius: '50px', px: 4, py: 1.5 }}
            >
              Připojuji...
            </Button>
          )}

          {isConnected && (
            <>
              <Tooltip title={isMuted ? 'Zapnout mikrofon' : 'Ztlumit mikrofon'}>
                <IconButton
                  onClick={toggleMute}
                  color={isMuted ? 'error' : 'default'}
                  sx={{ 
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    }
                  }}
                >
                  {isMuted ? <MicOffIcon /> : <MicIcon />}
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                size="large"
                startIcon={<PhoneDisabledIcon />}
                onClick={stopCall}
                sx={{ 
                  borderRadius: '50px',
                  px: 4,
                  py: 1.5,
                  backgroundColor: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: theme.palette.error.dark,
                  }
                }}
              >
                Ukončit hovor
              </Button>
            </>
          )}
        </Box>

        {/* Instructions */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isConnected ? (
              <>
                ✅ Připojeno k AI • 💬 Můžete mluvit<br />
                <Typography variant="caption">
                  🔄 Podporuje "barge-in" - můžete AI přerušit
                </Typography>
              </>
            ) : (
              <>
                Klikněte "Spustit hovor" pro WebRTC konverzaci<br />
                <Typography variant="caption">
                  🎧 Potřebujete mikrofon a reproduktory
                </Typography>
              </>
            )}
          </Typography>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ 
            mt: 2, 
            p: 1, 
            backgroundColor: theme.palette.grey[100], 
            borderRadius: 1 
          }}>
            <Typography variant="caption" color="text.secondary">
              Backend: {backendUrl}<br />
              User ID: {userId || 'N/A'}<br />
              Audio: {Math.round(audioLevel * 100)}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}; 