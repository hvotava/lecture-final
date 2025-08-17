import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Form, Badge } from 'react-bootstrap';
import { Settings, Phone, Activity } from 'lucide-react';
import WebRTCPhone from '../components/WebRTCPhone';

interface CallLog {
  id: string;
  timestamp: Date;
  duration: number;
  status: 'completed' | 'failed';
  error?: string;
}

const WebRTCDemo: React.FC = () => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isWebRTCSupported, setIsWebRTCSupported] = useState(false);
  const [permissions, setPermissions] = useState({
    microphone: 'unknown' as PermissionState | 'unknown'
  });

  useEffect(() => {
    // Kontrola podpory WebRTC
    const checkWebRTCSupport = () => {
      const supported = !!(
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection
      );
      setIsWebRTCSupported(supported);
    };

    // Kontrola oprávnění k mikrofonu
    const checkPermissions = async () => {
      try {
        if (navigator.permissions) {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissions(prev => ({
            ...prev,
            microphone: micPermission.state
          }));

          micPermission.addEventListener('change', () => {
            setPermissions(prev => ({
              ...prev,
              microphone: micPermission.state
            }));
          });
        }
      } catch (error) {
        console.error('Chyba při kontrole oprávnění:', error);
      }
    };

    checkWebRTCSupport();
    checkPermissions();
  }, []);

  const handleCallStart = (callId: string) => {
    console.log('Hovor zahájen:', callId);
  };

  const handleCallEnd = (callId: string) => {
    console.log('Hovor ukončen:', callId);
    // Přidání do logu (simulace)
    setCallLogs(prev => [...prev, {
      id: callId,
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 300) + 30, // 30-330 sekund
      status: 'completed'
    }]);
  };

  const handleCallError = (error: string) => {
    console.error('Chyba hovoru:', error);
    setCallLogs(prev => [...prev, {
      id: `error-${Date.now()}`,
      timestamp: new Date(),
      duration: 0,
      status: 'failed',
      error
    }]);
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Refresh permission status
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({
          ...prev,
          microphone: micPermission.state
        }));
      }
    } catch (error) {
      console.error('Chyba při žádosti o oprávnění:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPermissionBadge = (state: PermissionState | 'unknown') => {
    switch (state) {
      case 'granted':
        return <Badge bg="success">Povoleno</Badge>;
      case 'denied':
        return <Badge bg="danger">Zakázáno</Badge>;
      case 'prompt':
        return <Badge bg="warning">Vyžaduje potvrzení</Badge>;
      default:
        return <Badge bg="secondary">Neznámé</Badge>;
    }
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <Activity className="me-2" />
            WebRTC Demo - AI Voice Assistant
          </h2>
        </Col>
      </Row>

      {/* System Status */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <Settings className="me-2" />
              Stav systému
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="mb-2">
                    <strong>WebRTC podpora:</strong>{' '}
                    {isWebRTCSupported ? (
                      <Badge bg="success">Podporováno</Badge>
                    ) : (
                      <Badge bg="danger">Nepodporováno</Badge>
                    )}
                  </div>
                  <div className="mb-2">
                    <strong>Oprávnění k mikrofonu:</strong>{' '}
                    {getPermissionBadge(permissions.microphone)}
                    {permissions.microphone === 'denied' && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="ms-2"
                        onClick={requestMicrophonePermission}
                      >
                        Požádat o oprávnění
                      </Button>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-2">
                    <strong>Prohlížeč:</strong> {navigator.userAgent.split(' ').pop()}
                  </div>
                  <div className="mb-2">
                    <strong>Platforma:</strong> {navigator.platform}
                  </div>
                </Col>
              </Row>

              {!isWebRTCSupported && (
                <Alert variant="danger" className="mt-3">
                  <strong>WebRTC není podporováno!</strong>
                  <br />
                  Prosím, použijte moderní prohlížeč jako Chrome, Firefox, Safari nebo Edge.
                </Alert>
              )}

              {permissions.microphone === 'denied' && (
                <Alert variant="warning" className="mt-3">
                  <strong>Přístup k mikrofonu je zakázán!</strong>
                  <br />
                  Pro fungování hlasového asistenta je potřeba povolit přístup k mikrofonu v nastavení prohlížeče.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* WebRTC Phone */}
        <Col md={8}>
          <WebRTCPhone
            userId="demo-user"
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            onError={handleCallError}
          />
        </Col>

        {/* Call History */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <Phone className="me-2" />
              Historie hovorů
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {callLogs.length === 0 ? (
                <div className="text-center text-muted">
                  <p>Zatím žádné hovory</p>
                </div>
              ) : (
                <div>
                  {callLogs.slice().reverse().map((log) => (
                    <div key={log.id} className="border-bottom pb-2 mb-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-bold">
                            {log.status === 'completed' ? 'Úspěšný hovor' : 'Neúspěšný hovor'}
                          </div>
                          <small className="text-muted">
                            {log.timestamp.toLocaleString('cs-CZ')}
                          </small>
                        </div>
                        <Badge bg={log.status === 'completed' ? 'success' : 'danger'}>
                          {log.status === 'completed' ? formatDuration(log.duration) : 'Chyba'}
                        </Badge>
                      </div>
                      {log.error && (
                        <div className="text-danger small mt-1">
                          {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Instructions */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>Návod k použití</Card.Header>
            <Card.Body>
              <ol>
                <li>Ujistěte se, že máte povolený přístup k mikrofonu</li>
                <li>Klikněte na zelené tlačítko pro zahájení hovoru</li>
                <li>Počkejte na připojení k AI asistentovi</li>
                <li>Mluvte česky - AI asistent vám bude odpovídat</li>
                <li>Použijte tlačítka pro ztlumení mikrofonu nebo reproduktoru</li>
                <li>Ukončete hovor červeným tlačítkem</li>
              </ol>
              
              <Alert variant="info" className="mt-3">
                <strong>Tip:</strong> Tato verze používá WebRTC technologii pro přímé propojení s OpenAI Realtime API,
                což poskytuje nižší latenci a lepší kvalitu zvuku oproti standardnímu WebSocket řešení.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default WebRTCDemo; 