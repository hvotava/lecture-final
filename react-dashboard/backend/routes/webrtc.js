const express = require('express');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const { parse } = require('url');

const router = express.Router();

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
 * WebSocket route for Twilio Media Stream
 * Express-WS automatically handles this
 */
router.ws('/stream', (ws, req) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}_${process.hrtime.bigint()}`;
  console.log(`🔗🆕 [${sessionId}] BRAND NEW Twilio WebSocket connected via Express-WS`);
  console.log(`🔗🆕 [${sessionId}] Request URL:`, req.url);
  console.log(`🔗🆕 [${sessionId}] Connection timestamp:`, new Date().toISOString());
  console.log(`🔗🆕 [${sessionId}] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  // FORCE reset state for each new WebSocket connection - COMPLETELY ISOLATED
  let openaiSession = null;
  let openaiWs = null;
  let streamSid = null;
  let isOpenAIInitialized = false;
  let streamStartTime = null;
  let openaiConnectedTime = null;
  let callSid = null;
  
  console.log(`🔄🆕 [${sessionId}] COMPLETE STATE RESET:`);
  console.log(`   - openaiSession: ${openaiSession}`);
  console.log(`   - openaiWs: ${openaiWs}`);
  console.log(`   - streamSid: ${streamSid}`);
  console.log(`   - isOpenAIInitialized: ${isOpenAIInitialized}`);
  console.log(`   - streamStartTime: ${streamStartTime}`);
  console.log(`   - openaiConnectedTime: ${openaiConnectedTime}`);
  
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
        openaiConnectedTime = Date.now();
        console.log(`🤖 [${sessionId}] OpenAI WebSocket connected to session:`, openaiSession.id);
        console.log(`⏰ [${sessionId}] OpenAI connected at:`, new Date(openaiConnectedTime).toISOString());
        
        if (streamStartTime) {
          const connectionDelay = (openaiConnectedTime - streamStartTime) / 1000;
          console.log(`⏰ [${sessionId}] OpenAI connection took: ${connectionDelay}s from stream start`);
        }
      });
      
      openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data);
          
          // Log important events with details
          if (event.type === 'response.audio.delta') {
            console.log(`🔊 [${sessionId}] OpenAI audio delta (${event.delta?.length || 0} bytes)`);
          } else if (event.type === 'input_audio_buffer.speech_started') {
            console.log(`🎙️ [${sessionId}] User started speaking`);
          } else if (event.type === 'input_audio_buffer.speech_stopped') {
            console.log(`🔇 [${sessionId}] User stopped speaking`);
          } else if (event.type === 'response.audio.done') {
            console.log(`✅ [${sessionId}] OpenAI finished speaking`);
          } else if (event.type === 'error') {
            console.log(`❌ [${sessionId}] OpenAI error:`, event);
          } else {
            console.log(`🤖 [${sessionId}] OpenAI event:`, event.type, event);
          }
          
          if (event.type === 'response.audio.delta' && event.delta && streamSid) {
            if (ws.readyState === WebSocket.OPEN) {
              // Send audio back to Twilio
              const audioMessage = {
                event: 'media',
                streamSid: streamSid,
                media: {
                  payload: event.delta
                }
              };
              ws.send(JSON.stringify(audioMessage));
              console.log(`📤 [${sessionId}] Sent ${event.delta.length} bytes audio to Twilio`);
            } else {
              console.log(`⚠️ [${sessionId}] Cannot send audio - Twilio WebSocket closed`);
            }
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
      // Skip logging media events to avoid Railway rate limit
      if (data.event !== 'media') {
        console.log(`📨 [${sessionId}] Twilio message:`, data.event);
        console.log(`📋 [${sessionId}] Full Twilio data:`, JSON.stringify(data, null, 2));
      }
      
      switch (data.event) {
        case 'connected':
          console.log(`🔌 [${sessionId}] Connected to Twilio Media Stream`);
          if (data.protocol) {
            console.log(`📡 [${sessionId}] Protocol:`, data.protocol);
          }
          break;
          
        case 'start':
          streamSid = data.streamSid;
          streamStartTime = Date.now();
          callSid = data.start?.callSid || 'unknown';
          
          console.log(`▶️ [${sessionId}] STREAM START EVENT`);
          console.log(`   - streamSid: ${streamSid}`);
          console.log(`   - callSid: ${callSid}`);
          console.log(`   - timestamp: ${new Date(streamStartTime).toISOString()}`);
          console.log(`🔑 [${sessionId}] OpenAI API key available:`, process.env.OPENAI_API_KEY ? 'YES' : 'NO');
          
          if (!isOpenAIInitialized) {
            console.log(`🚀 [${sessionId}] Initializing OpenAI on STREAM START...`);
            isOpenAIInitialized = true;
            initializeOpenAI();
            console.log(`✅ [${sessionId}] OpenAI initialization triggered`);
          } else {
            console.log(`⚠️ [${sessionId}] OpenAI already initialized, skipping`);
          }
          break;
          
        case 'media':
          // Reduced logging to avoid Railway rate limit
          if (Math.random() < 0.001) { // Log ~0.1% of media events
            console.log(`🎵 [${sessionId}] Audio data received (streamSid: ${data.streamSid})`);
          }
          
          // CRITICAL FALLBACK: Initialize OpenAI immediately on first media if no start event
          if (!isOpenAIInitialized && data.streamSid) {
            streamSid = data.streamSid;
            streamStartTime = Date.now(); // Set start time here too
            
            console.log(`🚨 [${sessionId}] CRITICAL FALLBACK: No start event received!`);
            console.log(`⚠️ [${sessionId}] Initializing OpenAI on FIRST MEDIA event`);
            console.log(`   - streamSid: ${streamSid}`);
            console.log(`   - timestamp: ${new Date(streamStartTime).toISOString()}`);
            console.log(`🔑 [${sessionId}] OpenAI API key available:`, process.env.OPENAI_API_KEY ? 'YES' : 'NO');
            
            isOpenAIInitialized = true;
            initializeOpenAI();
            
            console.log(`✅ [${sessionId}] FALLBACK OpenAI initialization triggered`);
          }
          
          // Forward audio to OpenAI
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            const audioEvent = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            openaiWs.send(JSON.stringify(audioEvent));
            
            // Log very rarely to avoid Railway rate limit
            if (Math.random() < 0.0001) { // Extremely rarely
              console.log(`📤 [${sessionId}] Forwarded ${data.media.payload.length} bytes audio to OpenAI`);
            }
          } else if (isOpenAIInitialized) {
            console.log(`⚠️ [${sessionId}] Cannot forward audio - OpenAI WebSocket not ready (state: ${openaiWs?.readyState})`);
          }
          break;
          
        case 'stop':
          const streamEndTime = Date.now();
          const streamDuration = streamStartTime ? (streamEndTime - streamStartTime) / 1000 : 'unknown';
          const stopCallSid = data.stop?.callSid || 'unknown';
          
          console.log(`⏹️ [${sessionId}] STREAM STOPPED`);
          console.log(`   - callSid: ${stopCallSid}`);
          console.log(`   - streamSid: ${data.streamSid || 'unknown'}`);
          console.log(`   - stream duration: ${streamDuration}s`);
          console.log(`   - OpenAI connected: ${openaiConnectedTime ? 'YES' : 'NO'}`);
          
          if (openaiConnectedTime && streamStartTime) {
            const openaiDelay = (openaiConnectedTime - streamStartTime) / 1000;
            console.log(`⏰ [${sessionId}] TIMING ANALYSIS:`);
            console.log(`   - OpenAI connection delay: ${openaiDelay}s`);
            console.log(`   - Stream vs OpenAI: ${streamDuration > openaiDelay ? 'OK' : 'PROBLEM - Stream ended before OpenAI connected!'}`);
          } else {
            console.log(`❌ [${sessionId}] PROBLEM: OpenAI never connected during ${streamDuration}s stream`);
          }
          
          if (openaiWs) {
            console.log(`🔌 [${sessionId}] Closing OpenAI WebSocket...`);
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
  
  console.log(`🚨🚨🚨 [${requestId}] TWILIO VOICE WEBHOOK CALLED! 🚨🚨🚨`);
  console.log(`[${requestId}] 📞 Incoming Twilio call:`, { CallSid, From, To });
  console.log(`[${requestId}] 🌐 Request URL:`, req.url);
  console.log(`[${requestId}] 📝 Query params:`, req.query);
  console.log(`[${requestId}] 🔗 Headers:`, JSON.stringify(req.headers, null, 2));

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream - FIXED: použití <Start> místo <Connect>
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v interaktivním školení. Připojuji vás k AI asistentovi.
  </Say>
  <Start>
    <Stream 
      name="openai_realtime_stream"
      url="${wsUrl}"
      track="both_tracks"
    />
  </Start>
  <Pause length="3600"/>
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

  // TwiML response s Media Stream - FIXED: použití <Start> místo <Connect>
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v interaktivním školení. Připojuji vás k AI asistentovi.
  </Say>
  <Start>
    <Stream 
      name="openai_realtime_stream"
      url="${wsUrl}"
      track="both_tracks"
    />
  </Start>
  <Pause length="3600"/>
</Response>`;

  console.log(`[${requestId}] 📡 TwiML WebSocket URL: ${wsUrl}`);
  console.log(`[${requestId}] 📄 TwiML Response:`, twiml);
  
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
    const { CallSid, CallStatus, Duration, CallDuration } = req.body;
    const requestId = req.headers['x-request-id'] || `status_${Date.now()}`;
    
    console.log(`[${requestId}] 📊 CALL STATUS UPDATE:`);
    console.log(`   - CallSid: ${CallSid}`);
    console.log(`   - Status: ${CallStatus}`);
    console.log(`   - Duration: ${Duration || 'N/A'}s (stream)`);
    console.log(`   - CallDuration: ${CallDuration || 'N/A'}s (call)`);
    
    // Compare durations if both available
    if (Duration && CallDuration && CallStatus === 'completed') {
      const durationDiff = parseInt(CallDuration) - parseInt(Duration);
      console.log(`⚖️ [${requestId}] DURATION COMPARISON:`);
      console.log(`   - Call lasted: ${CallDuration}s`);
      console.log(`   - Stream lasted: ${Duration}s`);
      console.log(`   - Difference: ${durationDiff}s`);
      
      if (durationDiff > 5) {
        console.log(`❌ [${requestId}] PROBLEM: Stream much shorter than call - OpenAI connection issue!`);
      } else if (durationDiff > 1) {
        console.log(`⚠️ [${requestId}] WARNING: Stream shorter than call - possible connection delay`);
      } else {
        console.log(`✅ [${requestId}] OK: Stream duration matches call duration`);
      }
    }

    // Log important status changes
    switch (CallStatus) {
      case 'ringing':
        console.log(`[${requestId}] 🔔 Call ringing...`);
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