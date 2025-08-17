const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// WebRTC konfigurace
const WebSocket = require('ws');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('wrtc');

// Aktivní WebRTC spojení
const activeConnections = new Map();

// Middleware pro logování
router.use((req, res, next) => {
    console.log(`[WebRTC] ${req.method} ${req.path}`, req.body);
    next();
});

/**
 * Endpoint pro příchozí Twilio WebRTC hovory
 */
router.post('/voice/incoming', async (req, res) => {
    try {
        const { CallSid, From, To } = req.body;
        const attemptId = req.query.attempt_id;

        console.log(`[WebRTC] Příchozí hovor: ${CallSid} z ${From} na ${To}`);

        // Vytvoření TwiML odpovědi pro WebRTC
        const twiml = new twilio.twiml.VoiceResponse();
        
        twiml.say({
            language: 'cs-CZ',
            voice: 'Google.cs-CZ-Standard-A'
        }, 'Připojuji vás k AI asistentovi přes WebRTC technologii.');

        // Připojení k WebRTC stream
        const connect = twiml.connect();
        connect.stream({
            name: 'webrtc_audio_stream',
            url: `wss://${req.get('host')}/api/twilio/webrtc/stream/${CallSid}`,
            track: 'both_tracks'
        });

        // Vytvoření WebRTC peer connection
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Uložení spojení
        activeConnections.set(CallSid, {
            peerConnection,
            callSid: CallSid,
            from: From,
            to: To,
            attemptId,
            createdAt: new Date()
        });

        console.log(`[WebRTC] Vytvořeno peer connection pro ${CallSid}`);

        res.type('text/xml');
        res.send(twiml.toString());

    } catch (error) {
        console.error('[WebRTC] Chyba při zpracování příchozího hovoru:', error);
        res.status(500).send('Chyba serveru');
    }
});

/**
 * WebSocket endpoint pro Twilio Media Stream
 */
router.ws('/stream/:callSid', (ws, req) => {
    const callSid = req.params.callSid;
    console.log(`[WebRTC] WebSocket připojen pro ${callSid}`);

    const connection = activeConnections.get(callSid);
    if (!connection) {
        console.error(`[WebRTC] Spojení nenalezeno pro ${callSid}`);
        ws.close();
        return;
    }

    let streamSid = null;

    // Zpracování zpráv z Twilio
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'start':
                    streamSid = data.streamSid;
                    console.log(`[WebRTC] Stream začal: ${streamSid}`);
                    
                    // Inicializace OpenAI Realtime API připojení
                    await initializeOpenAIConnection(connection, ws);
                    break;

                case 'media':
                    // Zpracování audio dat z Twilio
                    if (connection.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
                        const audioMessage = {
                            type: 'input_audio_buffer.append',
                            audio: data.media.payload
                        };
                        connection.openaiWs.send(JSON.stringify(audioMessage));
                    }
                    break;

                case 'stop':
                    console.log(`[WebRTC] Stream ukončen: ${streamSid}`);
                    await cleanupConnection(callSid);
                    break;
            }
        } catch (error) {
            console.error('[WebRTC] Chyba při zpracování WebSocket zprávy:', error);
        }
    });

    ws.on('close', async () => {
        console.log(`[WebRTC] WebSocket uzavřen pro ${callSid}`);
        await cleanupConnection(callSid);
    });

    ws.on('error', (error) => {
        console.error('[WebRTC] WebSocket chyba:', error);
    });
});

/**
 * Inicializace připojení k OpenAI Realtime API
 */
async function initializeOpenAIConnection(connection, twilioWs) {
    try {
        const WebSocket = require('ws');
        
        const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        connection.openaiWs = openaiWs;

        openaiWs.on('open', () => {
            console.log('[WebRTC] OpenAI WebSocket připojen');
            
            // Konfigurace session
            const sessionConfig = {
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    instructions: 'Jsi AI asistent pro výuku jazyků. Komunikuj pouze v češtině. Buď přátelský a pomáhej studentům učit se.',
                    voice: 'alloy',
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    input_audio_transcription: { model: 'whisper-1' },
                    turn_detection: {
                        type: 'server_vad',
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 800
                    },
                    tools: [],
                    tool_choice: 'auto',
                    temperature: 0.8,
                    max_response_output_tokens: 4096
                }
            };

            openaiWs.send(JSON.stringify(sessionConfig));
        });

        openaiWs.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                
                switch (message.type) {
                    case 'response.audio.delta':
                        // Odeslání audio odpovědi zpět do Twilio
                        if (message.delta && twilioWs.readyState === WebSocket.OPEN) {
                            const audioMessage = {
                                event: 'media',
                                streamSid: connection.streamSid,
                                media: {
                                    payload: message.delta
                                }
                            };
                            twilioWs.send(JSON.stringify(audioMessage));
                        }
                        break;

                    case 'input_audio_buffer.speech_started':
                        console.log('[WebRTC] Detekována řeč uživatele');
                        // Přerušení současné AI odpovědi
                        if (twilioWs.readyState === WebSocket.OPEN) {
                            twilioWs.send(JSON.stringify({
                                event: 'clear',
                                streamSid: connection.streamSid
                            }));
                        }
                        break;

                    case 'conversation.item.input_audio_transcription.completed':
                        if (message.transcript) {
                            console.log(`[WebRTC] Transkripce: ${message.transcript}`);
                        }
                        break;

                    case 'error':
                        console.error('[WebRTC] OpenAI chyba:', message);
                        break;
                }
            } catch (error) {
                console.error('[WebRTC] Chyba při zpracování OpenAI zprávy:', error);
            }
        });

        openaiWs.on('error', (error) => {
            console.error('[WebRTC] OpenAI WebSocket chyba:', error);
        });

        openaiWs.on('close', () => {
            console.log('[WebRTC] OpenAI WebSocket uzavřen');
        });

    } catch (error) {
        console.error('[WebRTC] Chyba při inicializaci OpenAI připojení:', error);
    }
}

/**
 * Vytvoření WebRTC offer
 */
router.post('/offer', async (req, res) => {
    try {
        const { callSid } = req.body;
        const connection = activeConnections.get(callSid);

        if (!connection) {
            return res.status(404).json({ error: 'Spojení nenalezeno' });
        }

        const offer = await connection.peerConnection.createOffer();
        await connection.peerConnection.setLocalDescription(offer);

        res.json({
            status: 'success',
            offer: {
                type: offer.type,
                sdp: offer.sdp
            }
        });

    } catch (error) {
        console.error('[WebRTC] Chyba při vytváření offer:', error);
        res.status(500).json({ error: 'Chyba při vytváření offer' });
    }
});

/**
 * Zpracování WebRTC answer
 */
router.post('/answer', async (req, res) => {
    try {
        const { callSid, answer } = req.body;
        const connection = activeConnections.get(callSid);

        if (!connection) {
            return res.status(404).json({ error: 'Spojení nenalezeno' });
        }

        const answerDescription = new RTCSessionDescription(answer);
        await connection.peerConnection.setRemoteDescription(answerDescription);

        res.json({ status: 'success' });

    } catch (error) {
        console.error('[WebRTC] Chyba při zpracování answer:', error);
        res.status(500).json({ error: 'Chyba při zpracování answer' });
    }
});

/**
 * Přidání ICE candidate
 */
router.post('/ice-candidate', async (req, res) => {
    try {
        const { callSid, candidate } = req.body;
        const connection = activeConnections.get(callSid);

        if (!connection) {
            return res.status(404).json({ error: 'Spojení nenalezeno' });
        }

        const iceCandidate = new RTCIceCandidate(candidate);
        await connection.peerConnection.addIceCandidate(iceCandidate);

        res.json({ status: 'success' });

    } catch (error) {
        console.error('[WebRTC] Chyba při přidávání ICE candidate:', error);
        res.status(500).json({ error: 'Chyba při přidávání ICE candidate' });
    }
});

/**
 * Status endpoint
 */
router.get('/status/:callSid', (req, res) => {
    const { callSid } = req.params;
    const connection = activeConnections.get(callSid);

    if (!connection) {
        return res.json({ status: 'not_found' });
    }

    res.json({
        status: 'active',
        connectionState: connection.peerConnection.connectionState,
        iceConnectionState: connection.peerConnection.iceConnectionState,
        callSid: callSid,
        createdAt: connection.createdAt
    });
});

/**
 * Ukončení hovoru
 */
router.post('/hangup', async (req, res) => {
    try {
        const { callSid } = req.body;
        await cleanupConnection(callSid);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('[WebRTC] Chyba při ukončování hovoru:', error);
        res.status(500).json({ error: 'Chyba při ukončování hovoru' });
    }
});

/**
 * Vyčištění spojení
 */
async function cleanupConnection(callSid) {
    try {
        const connection = activeConnections.get(callSid);
        if (!connection) return;

        // Uzavření OpenAI WebSocket
        if (connection.openaiWs) {
            connection.openaiWs.close();
        }

        // Uzavření WebRTC peer connection
        if (connection.peerConnection) {
            connection.peerConnection.close();
        }

        // Odstranění z mapy
        activeConnections.delete(callSid);

        console.log(`[WebRTC] Spojení vyčištěno pro ${callSid}`);
    } catch (error) {
        console.error('[WebRTC] Chyba při čištění spojení:', error);
    }
}

// Periodické čištění starých spojení
setInterval(() => {
    const now = new Date();
    for (const [callSid, connection] of activeConnections.entries()) {
        const age = now - connection.createdAt;
        // Vyčistit spojení starší než 1 hodina
        if (age > 60 * 60 * 1000) {
            console.log(`[WebRTC] Čištění starého spojení: ${callSid}`);
            cleanupConnection(callSid);
        }
    }
}, 5 * 60 * 1000); // Každých 5 minut

module.exports = router; 