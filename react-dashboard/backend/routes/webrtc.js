const express = require('express');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');

const router = express.Router();

// Configuration constants
const SYSTEM_MESSAGE = 'Jste AI asistent pro vzdělávací platformu. Mluvte česky a buďte nápomocní. Veď interaktivní konverzaci přes telefon. Udržujte odpovědi krátké a přirozené.';
const VOICE = 'alloy';
const LOG_EVENT_TYPES = [
    'response.content.done',
    'rate_limits.updated', 
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created'
];

/**
 * Test endpoint to check if routes work
 */
router.get('/stream', (req, res) => {
  res.json({ 
    status: 'WebSocket endpoint accessible',
    timestamp: new Date().toISOString(),
    note: 'This should be a WebSocket endpoint, but testing HTTP first'
  });
});

/**
 * WebSocket route for Twilio Media Stream - OFFICIAL TWILIO + OPENAI REALTIME API INTEGRATION
 */
router.ws('/stream', (ws, req) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`🎯 [${sessionId}] NEW Twilio WebSocket connected - OFFICIAL INTEGRATION`);
  
  // Direct OpenAI WebSocket connection (no Sessions API!)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error(`❌ [${sessionId}] Missing OpenAI API key`);
    ws.close();
    return;
  }
  
  console.log(`🔗 [${sessionId}] Connecting directly to OpenAI Realtime API...`);
  
  const openAiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );
  
  let streamSid = null;
  
  // Function to send session configuration to OpenAI
  const sendSessionUpdate = () => {
    const sessionUpdate = {
      type: 'session.update',
      session: {
        turn_detection: { type: 'server_vad' },
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        voice: VOICE,
        instructions: SYSTEM_MESSAGE,
        modalities: ["text", "audio"],
        temperature: 0.8,
      }
    };
    
    console.log(`📤 [${sessionId}] Sending session update to OpenAI`);
    openAiWs.send(JSON.stringify(sessionUpdate));
  };
  
  // OpenAI WebSocket event handlers
  openAiWs.on('open', () => {
    console.log(`✅ [${sessionId}] Connected to OpenAI Realtime API`);
    setTimeout(sendSessionUpdate, 250); // Send session config after connection stabilizes
  });
  
  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data);
      
      // Log important events
      if (LOG_EVENT_TYPES.includes(response.type)) {
        console.log(`🤖 [${sessionId}] OpenAI event: ${response.type}`);
      }
      
      // Handle audio response from OpenAI
      if (response.type === 'response.audio.delta' && response.delta) {
        if (streamSid && ws.readyState === WebSocket.OPEN) {
          const audioMessage = {
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: response.delta
            }
          };
          ws.send(JSON.stringify(audioMessage));
          
          // Log occasionally to avoid spam
          if (Math.random() < 0.01) {
            console.log(`🔊 [${sessionId}] Sent audio to Twilio (${response.delta.length} chars)`);
          }
        }
      }
      
      // Handle other important events
      if (response.type === 'input_audio_buffer.speech_started') {
        console.log(`🎙️ [${sessionId}] User started speaking`);
      }
      
      if (response.type === 'input_audio_buffer.speech_stopped') {
        console.log(`🔇 [${sessionId}] User stopped speaking`);
      }
      
      if (response.type === 'error') {
        console.error(`❌ [${sessionId}] OpenAI error:`, response.error);
      }
      
    } catch (error) {
      console.error(`❌ [${sessionId}] Error processing OpenAI message:`, error);
    }
  });
  
  openAiWs.on('error', (error) => {
    console.error(`❌ [${sessionId}] OpenAI WebSocket error:`, error);
  });
  
  openAiWs.on('close', () => {
    console.log(`🔌 [${sessionId}] OpenAI WebSocket closed`);
  });
  
  // Twilio WebSocket event handlers
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.event) {
        case 'connected':
          console.log(`🔌 [${sessionId}] Connected to Twilio Media Stream`);
          break;
          
        case 'start':
          streamSid = data.streamSid;
          console.log(`🎬 [${sessionId}] Stream started: ${streamSid}`);
          console.log(`📞 [${sessionId}] Call SID: ${data.start?.callSid}`);
          break;
          
        case 'media':
          // Forward audio to OpenAI
          if (openAiWs.readyState === WebSocket.OPEN) {
            const audioMessage = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            openAiWs.send(JSON.stringify(audioMessage));
            
            // Log very rarely to avoid spam
            if (Math.random() < 0.001) {
              console.log(`📤 [${sessionId}] Forwarded audio to OpenAI`);
            }
          }
          break;
          
        case 'stop':
          console.log(`⏹️ [${sessionId}] Stream stopped`);
          if (openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.close();
          }
          break;
      }
    } catch (error) {
      console.error(`❌ [${sessionId}] Error processing Twilio message:`, error);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [${sessionId}] Twilio WebSocket closed`);
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [${sessionId}] Twilio WebSocket error:`, error);
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
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
        silence_duration_ms: 500
      },
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      }
    };

    console.log(`[${requestId}] 📤 Sending request to OpenAI...`);

    // Create session using OpenAI API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionRequest)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[${requestId}] ❌ OpenAI API error:`, error);
      return res.status(response.status).json({
        error: 'Failed to create OpenAI session',
        details: error
      });
    }

    const sessionData = await response.json();
    console.log(`[${requestId}] ✅ Session created:`, sessionData.id);

    res.json({
      sessionId: sessionData.id,
      clientSecret: sessionData.client_secret,
      expiresAt: sessionData.expires_at,
      model: sessionData.model,
      voice: sessionData.voice
    });

  } catch (error) {
    console.error('❌ Session creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET/POST /voice
 * Twilio webhook pro příchozí hovory
 */
router.get('/voice', (req, res) => {
  const { CallSid, From, To } = req.query;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`🚨🚨🚨 [${requestId}] TWILIO VOICE WEBHOOK CALLED! 🚨🚨🚨`);
  console.log(`[${requestId}] 📞 Incoming Twilio call:`, { CallSid, From, To });
  console.log(`[${requestId}] 🌐 Request URL:`, req.url);
  console.log(`[${requestId}] 📝 Query params:`, req.query);
  console.log(`[${requestId}] 🔗 Headers:`, JSON.stringify(req.headers, null, 2));

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream - FIXED: použití <Connect> pro BIDIRECTIONAL stream!
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
  console.log(`[${requestId}] 📄 TwiML Response:`, twiml);
  
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
  
  // CRITICAL LOG - FORCE OUTPUT TO AVOID RAILWAY RATE LIMIT
  process.stderr.write(`🚨🚨🚨 WEBHOOK HIT: ${requestId} 🚨🚨🚨\n`);
  process.stdout.write(`🚨🚨🚨 WEBRTC WEBHOOK HIT! ${requestId}\n`);
  console.error(`🚨🚨🚨 [${requestId}] WEBRTC VOICE WEBHOOK CALLED (POST)! 🚨🚨🚨`);
  
  console.log(`[${requestId}] 📞 Incoming Twilio call (POST):`, { CallSid, From, To });
  console.log(`[${requestId}] 🌐 Request URL:`, req.url);
  console.log(`[${requestId}] 📝 Body:`, req.body);
  console.log(`[${requestId}] 🔗 Headers:`, JSON.stringify(req.headers, null, 2));

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream - FIXED: použití <Connect> pro BIDIRECTIONAL stream!
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
  console.log(`[${requestId}] 📄 TwiML Response:`, twiml);
  
  // Vrať TwiML jako XML
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /status
 * Webhook pro status update hovorů
 */
router.post('/status', (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, Timestamp } = req.body;
    const requestId = req.headers['x-request-id'] || `status_${Date.now()}`;

    console.log(`[${requestId}] 📊 CALL STATUS UPDATE:`);
    console.log(`   - CallSid: ${CallSid}`);
    console.log(`   - Status: ${CallStatus}`);
    console.log(`   - Duration: ${CallDuration}s (stream)`);
    console.log(`   - CallDuration: ${req.body.Duration}s (call)`);

    // Analyze duration discrepancy
    const streamDuration = parseInt(CallDuration) || 0;
    const callDuration = parseInt(req.body.Duration) || 0;
    
    if (callDuration > 0 && streamDuration > 0) {
      const difference = Math.abs(callDuration - streamDuration);
      console.log(`⚖️ [${requestId}] DURATION COMPARISON:`);
      console.log(`   - Call lasted: ${callDuration}s`);
      console.log(`   - Stream lasted: ${streamDuration}s`);
      console.log(`   - Difference: ${difference}s`);
      
      if (difference > 5) {
        console.log(`❌ [${requestId}] PROBLEM: Stream much shorter than call - OpenAI connection issue!`);
      }
    }

    switch (CallStatus) {
      case 'ringing':
        console.log(`[${requestId}] 📞 Call ringing...`);
        break;
      case 'in-progress':
        console.log(`[${requestId}] 🗣️ Call answered, stream should start soon...`);
        break;
      case 'completed':
        console.log(`[${requestId}] ✅ Call completed`);
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

/**
 * GET /test-openai
 * Test OpenAI API connectivity from Railway server
 */
router.get('/test-openai', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI API connectivity...');
    console.log('🔑 OpenAI API key available:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
    
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        status: 'error',
        message: 'OPENAI_API_KEY not set in environment variables',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test 1: Basic API connectivity
    const fetch = require('node-fetch');
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 Models API response status:', modelsResponse.status);
    
    if (!modelsResponse.ok) {
      const error = await modelsResponse.text();
      console.error('❌ Models API error:', error);
      return res.json({
        status: 'error',
        message: 'OpenAI API authentication failed',
        details: error,
        timestamp: new Date().toISOString()
      });
    }
    
    // Test 2: Realtime Sessions API
    const sessionResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy'
      })
    });
    
    console.log('🧪 Sessions API response status:', sessionResponse.status);
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      console.error('❌ Sessions API error:', error);
      return res.json({
        status: 'partial',
        message: 'Basic API works, but Realtime Sessions API failed',
        details: error,
        timestamp: new Date().toISOString()
      });
    }
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Sessions API success, session ID:', sessionData.id);
    
    res.json({
      status: 'success',
      message: 'OpenAI API fully functional',
      sessionId: sessionData.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OpenAI test error:', error);
    res.json({
      status: 'error',
      message: 'Network or connection error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 