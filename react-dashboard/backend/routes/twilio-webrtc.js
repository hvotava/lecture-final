const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const WebSocket = require('ws');

// Aktivní WebRTC signaling connections
const activeConnections = new Map();
const signalingClients = new Map(); // Pro browser WebRTC clients

// Middleware pro logování
router.use((req, res, next) => {
    console.log(`[WebRTC-Signaling] ${req.method} ${req.path}`, req.body);
    next();
});

/**
 * Endpoint pro příchozí Twilio WebRTC hovory s browser signaling
 */
router.post('/voice/incoming', async (req, res) => {
    try {
        const { CallSid, From, To } = req.body;
        const attemptId = req.query.attempt_id;

        console.log(`[WebRTC-Signaling] Příchozí hovor: ${CallSid} z ${From} na ${To}`);

        // Pokusit se načíst lesson data pro uživatele (pokud je hovor z admin dashboardu)
        let lessonMessage = 'Připojuji vás k AI asistentovi přes WebRTC s real-time komunikací.';
        
        try {
            // Import lesson selector
            const { getLessonForUser } = require('./lesson-selector');
            const lessonData = await getLessonForUser(To);
            
            if (lessonData && lessonData.message) {
                lessonMessage = lessonData.message;
                console.log(`[WebRTC-Signaling] Lesson data loaded for ${To}: ${lessonData.title}`);
                
                // Uložit lesson data do connection info
                activeConnections.set(CallSid, {
                    callSid: CallSid,
                    from: From,
                    to: To,
                    attemptId,
                    lessonData: lessonData,
                    createdAt: new Date(),
                    status: 'initiated'
                });
            }
        } catch (lessonError) {
            console.log(`[WebRTC-Signaling] No lesson data found for ${To}, using default message`);
        }

        // Vytvoření TwiML odpovědi pro WebRTC s browser signaling
        const twiml = new twilio.twiml.VoiceResponse();
        
        twiml.say({
            language: 'cs-CZ',
            voice: 'Google.cs-CZ-Standard-A'
        }, lessonMessage);

        // Připojení k WebSocket stream pro signaling
        const connect = twiml.connect();
        connect.stream({
            name: 'webrtc_signaling_stream',
            url: `wss://${req.get('host')}/api/twilio/webrtc/stream/${CallSid}`,
            track: 'both_tracks'
        });

        // Uložení spojení info (pokud ještě nebylo uloženo s lesson daty)
        if (!activeConnections.has(CallSid)) {
            activeConnections.set(CallSid, {
                callSid: CallSid,
                from: From,
                to: To,
                attemptId,
                createdAt: new Date(),
                status: 'initiated'
            });
        }

        console.log(`[WebRTC-Signaling] Signaling connection info uloženo pro ${CallSid}`);

        res.type('text/xml');
        res.send(twiml.toString());

    } catch (error) {
        console.error('[WebRTC-Signaling] Chyba při zpracování příchozího hovoru:', error);
        res.status(500).send('Chyba serveru');
    }
});

/**
 * WebSocket endpoint pro Twilio Media Stream + WebRTC Signaling
 */
router.ws('/stream/:callSid', (ws, req) => {
    const callSid = req.params.callSid;
    console.log(`[WebRTC-Signaling] WebSocket připojen pro ${callSid}`);

    const connection = activeConnections.get(callSid);
    if (!connection) {
        console.error(`[WebRTC-Signaling] Spojení nenalezeno pro ${callSid}`);
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
                    connection.streamSid = streamSid;
                    connection.status = 'connected';
                    console.log(`[WebRTC-Signaling] Stream začal: ${streamSid}`);
                    
                    // Inicializace OpenAI Realtime API připojení
                    await initializeOpenAIConnection(connection, ws);
                    
                    // Notifikace browser clients o novém hovoru
                    notifyBrowserClients(callSid, 'call_started');
                    break;

                case 'media':
                    // Zpracování audio dat z Twilio - přeposíláme do OpenAI
                    if (connection.openaiWs && connection.openaiWs.readyState === WebSocket.OPEN) {
                        const audioMessage = {
                            type: 'input_audio_buffer.append',
                            audio: data.media.payload
                        };
                        connection.openaiWs.send(JSON.stringify(audioMessage));
                    }
                    
                    // Také přeposíláme do browser clients pro WebRTC
                    forwardToBrowserClients(callSid, 'twilio_audio', data.media);
                    break;

                case 'stop':
                    console.log(`[WebRTC-Signaling] Stream ukončen: ${streamSid}`);
                    notifyBrowserClients(callSid, 'call_ended');
                    await cleanupConnection(callSid);
                    break;
            }
        } catch (error) {
            console.error('[WebRTC-Signaling] Chyba při zpracování WebSocket zprávy:', error);
        }
    });

    ws.on('close', async () => {
        console.log(`[WebRTC-Signaling] WebSocket uzavřen pro ${callSid}`);
        await cleanupConnection(callSid);
    });

    ws.on('error', (error) => {
        console.error('[WebRTC-Signaling] WebSocket chyba:', error);
    });
});

/**
 * WebSocket endpoint pro browser WebRTC signaling
 */
router.ws('/signaling/:clientId', (ws, req) => {
    const clientId = req.params.clientId;
    console.log(`[WebRTC-Signaling] Browser client připojen: ${clientId}`);

    // Uložení browser client
    signalingClients.set(clientId, {
        ws: ws,
        clientId: clientId,
        connectedAt: new Date()
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`[WebRTC-Signaling] Zpráva od browser client ${clientId}:`, data.type);

            switch (data.type) {
                case 'webrtc_offer':
                    // Přeposlání WebRTC offer
                    handleWebRTCSignaling(clientId, data);
                    break;
                    
                case 'webrtc_answer':
                    // Přeposlání WebRTC answer
                    handleWebRTCSignaling(clientId, data);
                    break;
                    
                case 'ice_candidate':
                    // Přeposlání ICE candidate
                    handleWebRTCSignaling(clientId, data);
                    break;
                    
                case 'browser_audio':
                    // Audio z browser WebRTC - přeposlání do Twilio
                    forwardBrowserAudioToTwilio(data);
                    break;
            }
        } catch (error) {
            console.error('[WebRTC-Signaling] Chyba při zpracování browser zprávy:', error);
        }
    });

    ws.on('close', () => {
        console.log(`[WebRTC-Signaling] Browser client odpojeno: ${clientId}`);
        signalingClients.delete(clientId);
    });

    ws.on('error', (error) => {
        console.error('[WebRTC-Signaling] Browser client chyba:', error);
    });
});

/**
 * Inicializace připojení k OpenAI Realtime API
 */
async function initializeOpenAIConnection(connection, twilioWs) {
    try {
        const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        connection.openaiWs = openaiWs;

        openaiWs.on('open', () => {
            console.log('[WebRTC-Signaling] OpenAI WebSocket připojen');
            
            // Vytvořit instructions na základě lesson data
            let instructions = 'Jsi AI asistent pro výuku jazyků. Komunikuj pouze v češtině. Buď přátelský a pomáhej studentům učit se.';
            
            if (connection.lessonData) {
                const lesson = connection.lessonData;
                instructions = `Jsi AI asistent pro interaktivní výuku. Komunikuj pouze v češtině. Buď přátelský a trpělivý učitel.

DŮLEŽITÉ: NIKDY neukončuj hovor sám od sebe! Vždy čekej na reakci studenta!

Nyní vedeš kompletní interaktivní lekci: "${lesson.title}"
${lesson.content ? 'Obsah lekce: ' + lesson.content : ''}

POSTUP LEKCE:
1. ÚVOD: Přivítej studenta a představ téma lekce
2. VÝUKA: Vysvětluj obsah po malých částech, ptej se "Rozumíš tomu?" "Máš nějaké otázky?"
3. INTERAKCE: Povzbuzuj studenta k dotazům a diskusi během výkladu
4. PROCVIČENÍ: ${lesson.type === 'lesson' ? 'Po vysvětlení každé části polož ověřovací otázky' : ''}
5. TEST: ${lesson.type === 'test' || lesson.questions ? 'Na konci proveď test s těmito otázkami: ' + JSON.stringify(lesson.questions || []) : 'Na konci shrň hlavní body'}
6. ZÁVĚR: Shrň co student zvládl a co by měl procvičit

${lesson.type === 'placement_test' ? 'SPECIÁLNÍ: Proveď rozřazovací test pro určení úrovně studenta.' : ''}

PRAVIDLA:
- Mluv pomalu a srozumitelně
- Čekej na odpovědi studenta
- Ptej se "Pokračujeme?" před přechodem k dalšímu bodu
- Povzbuzuj k dotazům: "Zeptej se na cokoliv co ti není jasné"
- Nikdy neříkej "nashledanou" nebo neukončuj hovor
- Pokud student mlčí, zeptej se "Jsi tu? Máš nějakou otázku?"

ZAČNI NYNÍ úvodem k lekci a počkej na reakci studenta!`;
                
                console.log('[WebRTC-Signaling] Interactive lesson instructions created:', lesson.title);
            }
            
            // Konfigurace session
            const sessionConfig = {
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    instructions: instructions,
                    voice: 'alloy',
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    input_audio_transcription: { model: 'whisper-1' },
                    turn_detection: {
                        type: 'server_vad',
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 1500  // Delší čekání na odpověď studenta
                    },
                    tools: [],
                    tool_choice: 'auto',
                    temperature: 0.7,  // Konzistentnější odpovědi pro výuku
                    max_response_output_tokens: 2048  // Kratší odpovědi pro lepší interakci
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
                        
                        // Také odeslání do browser clients
                        forwardToBrowserClients(connection.callSid, 'openai_audio', {
                            payload: message.delta
                        });
                        break;

                    case 'input_audio_buffer.speech_started':
                        console.log('[WebRTC-Signaling] Detekována řeč uživatele');
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
                            console.log(`[WebRTC-Signaling] Transkripce: ${message.transcript}`);
                        }
                        break;

                    case 'error':
                        console.error('[WebRTC-Signaling] OpenAI chyba:', message);
                        break;
                }
            } catch (error) {
                console.error('[WebRTC-Signaling] Chyba při zpracování OpenAI zprávy:', error);
            }
        });

        openaiWs.on('error', (error) => {
            console.error('[WebRTC-Signaling] OpenAI WebSocket chyba:', error);
        });

        openaiWs.on('close', () => {
            console.log('[WebRTC-Signaling] OpenAI WebSocket uzavřen');
        });

    } catch (error) {
        console.error('[WebRTC-Signaling] Chyba při inicializaci OpenAI připojení:', error);
    }
}

/**
 * Notifikace browser clients
 */
function notifyBrowserClients(callSid, eventType, data = {}) {
    const message = {
        type: eventType,
        callSid: callSid,
        data: data
    };
    
    for (const [clientId, client] of signalingClients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
}

/**
 * Přeposlání dat do browser clients
 */
function forwardToBrowserClients(callSid, dataType, payload) {
    const message = {
        type: 'audio_data',
        callSid: callSid,
        dataType: dataType,
        payload: payload
    };
    
    for (const [clientId, client] of signalingClients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
}

/**
 * Zpracování WebRTC signaling zpráv
 */
function handleWebRTCSignaling(clientId, signalingData) {
    console.log(`[WebRTC-Signaling] WebRTC signaling od ${clientId}:`, signalingData.type);
    
    const client = signalingClients.get(clientId);
    if (!client) {
        console.error(`[WebRTC-Signaling] Client ${clientId} nenalezen`);
        return;
    }
    
    switch (signalingData.type) {
        case 'webrtc_offer':
            console.log(`[WebRTC-Signaling] Zpracování WebRTC offer od ${clientId}`);
            // Pro demo - echo offer zpět jako answer
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                    type: 'webrtc_answer',
                    answer: {
                        type: 'answer',
                        sdp: signalingData.offer.sdp.replace('a=sendrecv', 'a=recvonly')
                    },
                    clientId: clientId
                }));
            }
            break;
            
        case 'webrtc_answer':
            console.log(`[WebRTC-Signaling] WebRTC answer přijat od ${clientId}`);
            // Zpracovat answer
            break;
            
        case 'ice_candidate':
            console.log(`[WebRTC-Signaling] ICE candidate od ${clientId}:`, signalingData.candidate?.candidate?.substring(0, 50));
            // Pro demo - echo ICE candidate zpět
            if (client.ws.readyState === WebSocket.OPEN) {
                setTimeout(() => {
                    client.ws.send(JSON.stringify({
                        type: 'ice_candidate',
                        candidate: {
                            candidate: 'candidate:1 1 UDP 2113667326 192.168.1.1 54400 typ host',
                            sdpMLineIndex: 0,
                            sdpMid: '0'
                        },
                        clientId: clientId
                    }));
                }, 100);
            }
            break;
            
        default:
            console.log(`[WebRTC-Signaling] Neznámý signaling type: ${signalingData.type}`);
    }
}

/**
 * Přeposlání browser audio do Twilio
 */
function forwardBrowserAudioToTwilio(audioData) {
    console.log('[WebRTC-Signaling] Audio z browser client přijato:', audioData.dataType || 'unknown');
    
    // Najít aktivní Twilio connections
    for (const [callSid, connection] of activeConnections.entries()) {
        if (connection.status === 'connected' && connection.openaiWs) {
            // Přeposlat audio data do OpenAI
            try {
                const audioMessage = {
                    type: 'input_audio_buffer.append',
                    audio: audioData.payload || audioData.audio
                };
                
                if (connection.openaiWs.readyState === WebSocket.OPEN) {
                    connection.openaiWs.send(JSON.stringify(audioMessage));
                    console.log(`[WebRTC-Signaling] Audio přeposlán do OpenAI pro ${callSid}`);
                } else {
                    console.warn(`[WebRTC-Signaling] OpenAI WebSocket není připojen pro ${callSid}`);
                }
            } catch (error) {
                console.error('[WebRTC-Signaling] Chyba při přeposílání audio do OpenAI:', error);
            }
        }
    }
    
    // Pokud není žádné aktivní spojení, informovat browser
    if (activeConnections.size === 0) {
        console.log('[WebRTC-Signaling] Žádné aktivní Twilio spojení pro browser audio');
    }
}

/**
 * REST API endpointy pro WebRTC
 */

// Status endpoint
router.get('/status/:callSid', (req, res) => {
    const { callSid } = req.params;
    const connection = activeConnections.get(callSid);

    if (!connection) {
        return res.json({ status: 'not_found' });
    }

    res.json({
        status: connection.status || 'unknown',
        callSid: callSid,
        createdAt: connection.createdAt,
        streamSid: connection.streamSid,
        connectedClients: signalingClients.size
    });
});

// Ukončení hovoru
router.post('/hangup', async (req, res) => {
    try {
        const { callSid } = req.body;
        await cleanupConnection(callSid);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('[WebRTC-Signaling] Chyba při ukončování hovoru:', error);
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

        // Notifikace browser clients
        notifyBrowserClients(callSid, 'connection_cleanup');

        // Odstranění z mapy
        activeConnections.delete(callSid);

        console.log(`[WebRTC-Signaling] Spojení vyčištěno pro ${callSid}`);
    } catch (error) {
        console.error('[WebRTC-Signaling] Chyba při čištění spojení:', error);
    }
}

// Periodické čištění starých spojení
setInterval(() => {
    const now = new Date();
    
    // Čištění starých call connections
    for (const [callSid, connection] of activeConnections.entries()) {
        const age = now - connection.createdAt;
        if (age > 60 * 60 * 1000) { // 1 hodina
            console.log(`[WebRTC-Signaling] Čištění starého spojení: ${callSid}`);
            cleanupConnection(callSid);
        }
    }
    
    // Čištění starých browser clients
    for (const [clientId, client] of signalingClients.entries()) {
        const age = now - client.connectedAt;
        if (age > 2 * 60 * 60 * 1000) { // 2 hodiny
            console.log(`[WebRTC-Signaling] Čištění starého browser clienta: ${clientId}`);
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
            }
            signalingClients.delete(clientId);
        }
    }
}, 5 * 60 * 1000); // Každých 5 minut

module.exports = router; 