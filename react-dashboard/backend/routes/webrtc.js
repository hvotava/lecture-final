const express = require('express');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const { parse } = require('url');

const router = express.Router();

/**
 * WebSocket route for Twilio Media Stream
 * Express-WS automatically handles this
 */
router.ws('/stream', (ws, req) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`🔗 [${sessionId}] Twilio WebSocket connected via Express-WS`);
  console.log(`🔗 [${sessionId}] Request URL:`, req.url);
  
  let openaiSession = null;
  let openaiWs = null;
  let streamSid = null;
  
  // Initialize OpenAI Session using Sessions API (same as WebRTC dialog)
  const initializeOpenAI = async () => {
    try {
      console.log(`🚀 [${sessionId}] Initializing OpenAI session via Sessions API...`);
      
      // Create OpenAI session using the same endpoint as WebRTC dialog
      const sessionRequest = {
        voice: 'alloy',
        temperature: 0.8,
        instructions: 'Jste AI asistent pro vzdělávací platformu. Mluvte česky a buďte nápomocní. Veď interaktivní konverzaci přes telefon.'
      };
      
      console.log(`🔗 [${sessionId}] Creating OpenAI session...`);
      
      // Use the same logic as /session endpoint
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error(`❌ [${sessionId}] OpenAI API key not configured`);
        return;
      }
      
      // Create session via OpenAI Sessions API
      const sessionResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: sessionRequest.voice,
          modalities: ['text', 'audio'],
          instructions: sessionRequest.instructions,
          temperature: sessionRequest.temperature,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          }
        })
      });
      
      if (!sessionResponse.ok) {
        const error = await sessionResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ [${sessionId}] Failed to create OpenAI session:`, error);
        return;
      }
      
      openaiSession = await sessionResponse.json();
      console.log(`✅ [${sessionId}] OpenAI session created:`, openaiSession.id);
      
      // Connect to the session WebSocket
      const wsUrl = `${openaiSession.client_secret.value}`;
      console.log(`🔗 [${sessionId}] Connecting to OpenAI WebSocket...`);
      
      openaiWs = new WebSocket(wsUrl);
      
      openaiWs.on('open', () => {
        console.log(`🤖 [${sessionId}] OpenAI WebSocket connected to session:`, openaiSession.id);
      });
      
      openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data);
          console.log(`🤖 [${sessionId}] OpenAI event:`, event.type);
          
          if (event.type === 'response.audio.delta' && event.delta && streamSid) {
            // Send audio back to Twilio
            const audioMessage = {
              event: 'media',
              streamSid: streamSid,
              media: {
                payload: event.delta
              }
            };
            ws.send(JSON.stringify(audioMessage));
            console.log(`🔊 [${sessionId}] Sent audio to Twilio`);
          }
        } catch (error) {
          console.error(`❌ [${sessionId}] Error processing OpenAI message:`, error);
        }
      });
      
      openaiWs.on('error', (error) => {
        console.error(`❌ [${sessionId}] OpenAI WebSocket error:`, error);
      });
      
      openaiWs.on('close', () => {
        console.log(`🔌 [${sessionId}] OpenAI WebSocket disconnected`);
      });
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Error initializing OpenAI session:`, error);
    }
  };
  
  // Handle Twilio Media Stream messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 [${sessionId}] Twilio message:`, data.event);
      
      switch (data.event) {
        case 'start':
          streamSid = data.streamSid;
          console.log(`▶️ [${sessionId}] Stream started:`, streamSid);
          console.log(`🔑 [${sessionId}] OpenAI API key available:`, process.env.OPENAI_API_KEY ? 'YES' : 'NO');
          // Initialize OpenAI connection
          initializeOpenAI();
          break;
          
        case 'media':
          console.log(`🎵 [${sessionId}] Audio data received`);
          // Forward audio to OpenAI
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            const audioEvent = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            openaiWs.send(JSON.stringify(audioEvent));
          }
          break;
          
        case 'stop':
          console.log(`⏹️ [${sessionId}] Stream stopped`);
          if (openaiWs) {
            openaiWs.close();
          }
          break;
      }
    } catch (error) {
      console.error(`❌ [${sessionId}] Error parsing message:`, error);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [${sessionId}] WebSocket disconnected`);
    if (openaiWs) {
      openaiWs.close();
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [${sessionId}] WebSocket error:`, error);
    if (openaiWs) {
      openaiWs.close();
    }
  });
});

// Rate limiting: 30 requests per minute per IP
const sessionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many session requests',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /session
 * Vytvoří OpenAI ephemeral session
 */
router.post('/session', sessionRateLimit, async (req, res) => {
  try {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`[${requestId}] 🔑 Creating OpenAI session...`);

    const { instructions, voice = 'alloy', temperature = 0.8, max_response_output_tokens = 4096 } = req.body;

    // Default instructions for Czech language learning
    const defaultInstructions = `Jsi AI asistent pro výuku českého jazyka v oblasti průmyslu a technologií. 
Tvoje role:
1. Veď interaktivní lekce podle obsahu, který ti bude poskytnut
2. Odpovídej v češtině, používej jasný a srozumitelný jazyk
3. Ptej se na otázky k ověření porozumění
4. Povzbuzuj studenta k aktivní účasti
5. Po dokončení lekce proveď krátký test
6. Umožni "barge-in" - student tě může kdykoliv přerušit s otázkou

Mluvíš přirozeně a trpělivě. Čekáš na reakce studenta.`;

    // Prepare request for OpenAI Realtime Sessions API
    const sessionRequest = {
      model: 'gpt-4o-realtime-preview',
      voice,
      modalities: ['text', 'audio'],
      instructions: instructions || defaultInstructions,
      temperature,
      max_response_output_tokens,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      }
    };

    console.log(`[${requestId}] 📡 Requesting ephemeral session from OpenAI...`);

    // Call OpenAI Realtime Sessions API
    const fetch = require('node-fetch');
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify(sessionRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] ❌ OpenAI API error:`, response.status, errorText);
      
      return res.status(response.status).json({
        error: 'OpenAI API error',
        message: errorText,
        requestId
      });
    }

    const sessionData = await response.json();
    console.log(`[${requestId}] ✅ Session created:`, sessionData.id);

    // Return session data to frontend
    res.json({
      success: true,
      session: sessionData,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    console.error(`[${requestId}] 💥 Session creation error:`, error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.message,
        requestId
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      requestId
    });
  }
});

/**
 * GET /session/health
 * Health check pro session endpoint
 */
router.get('/session/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoint: '/session',
    rateLimit: '30 req/min',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /voice
 * Twilio Voice webhook - vrací TwiML pro Media Stream
 */
router.get('/voice', (req, res) => {
  const { CallSid, From, To } = req.query;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`[${requestId}] 📞 Incoming Twilio call:`, { CallSid, From, To });

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v interaktivním školení. Připojuji vás k AI asistentovi.
  </Say>
  <Connect>
    <Stream 
      name="openai_realtime_stream"
      url="${wsUrl}"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 TwiML WebSocket URL: ${wsUrl}`);
  
  // Vrať TwiML jako XML
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /voice  
 * Alternativní endpoint pro POST requests z Twilio
 */
router.post('/voice', (req, res) => {
  const { CallSid, From, To } = req.body;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`[${requestId}] 📞 Incoming Twilio call (POST):`, { CallSid, From, To });

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v interaktivním školení. Připojuji vás k AI asistentovi.
  </Say>
  <Connect>
    <Stream 
      name="openai_realtime_stream"
      url="${wsUrl}"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 TwiML WebSocket URL: ${wsUrl}`);
  
  // Vrať TwiML jako XML
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /status
 * Twilio status callback webhook
 */
router.post('/status', (req, res) => {
  try {
    const { CallSid, CallStatus, Duration } = req.body;
    const requestId = req.headers['x-request-id'] || `status_${Date.now()}`;
    
    console.log(`[${requestId}] 📊 Call status update:`, { 
      CallSid, 
      CallStatus, 
      Duration: Duration ? `${Duration}s` : 'N/A'
    });
    console.log(`[${requestId}] 📋 Full request body:`, req.body);

  // Log important status changes
  switch (CallStatus) {
    case 'ringing':
      console.log(`[${requestId}] 🔔 Call ringing...`);
      break;
    case 'in-progress':
      console.log(`[${requestId}] 🗣️ Call answered, stream starting...`);
      break;
    case 'completed':
      console.log(`[${requestId}] ✅ Call completed after ${Duration || '?'}s`);
      break;
    case 'busy':
    case 'no-answer':
    case 'failed':
      console.log(`[${requestId}] ❌ Call failed: ${CallStatus}`);
      break;
  }

  // Twilio očekává 200 OK response
  res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Status webhook error:', error);
    res.status(500).send('Error');
  }
});

/**
 * GET /health
 * Health check pro WebRTC endpoints
 */
router.get('/health', (req, res) => {
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  
  res.json({
    status: 'healthy',
    endpoints: {
      voice: `${process.env.APP_BASE_URL || `https://${req.get('host')}`}/api/webrtc/voice`,
      stream: `wss://${baseUrl}/api/webrtc/stream`,
      status: `${process.env.APP_BASE_URL || `https://${req.get('host')}`}/api/webrtc/status`
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 