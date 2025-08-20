const express = require('express');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { User, Lesson } = require('../models');
const aiTutorService = require('../services/aiTutor');

const router = express.Router();

// WebSocket setup
const expressWs = require('express-ws')(router);

// OpenAI configuration
const VOICE = 'alloy';
const SYSTEM_MESSAGE = `Jsi AI lektor pro firemní školení. Tvým úkolem je vést uživatele kompletní lekcí od začátku až do konce.

TVOJE ROLE:
- Jsi přátelský, profesionální AI lektor
- Komunikuješ pouze v češtině
- Vedeš strukturované lekce s jasným postupem
- Držíš se tématu a struktury lekce
- Jsi trpělivý a motivující

STRUKTURA LEKCE:
1. PŘEDSTAVENÍ - Představ lekci, cíle, odhadovanou délku
2. OBSAH - Rozděl na segmenty, po každém polož kontrolní otázku
3. TEST - Postupně pokládej připravené otázky
4. VYHODNOCENÍ - Spočítej výsledky, vysvětli chyby
5. DOPORUČENÍ - Navrhni další kroky

PRAVIDLA:
- Odpovídej krátce a jasně (max 3-4 věty najednou)
- Po každém segmentu obsahu polož kontrolní otázku
- Dotazy mimo téma zodpoví stručně, ale vrať se k lekci
- V testu nesděluj správné odpovědi až do konce
- Vždy uložíš výsledky do databáze
- Motivuj uživatele a chval pokrok

Začni uvítáním a automaticky spusť přiřazenou lekci uživatele.`;

// Logging configuration
const LOG_EVENT_TYPES = [
    'error',
    'session.created',
    'session.updated', 
    'response.created',
    'response.done',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'conversation.item.input_audio_transcription.completed'
];

// Helper function to initialize AI Tutor session for Twilio calls
async function initializeTutorSession(callSid, sessionId, userPhone = null) {
  try {
    console.log(`🎓 [${sessionId}] Initializing AI Tutor session for call: ${callSid}`);
    
    let user = null;
    
    // Try to find user by phone number if available
    if (userPhone) {
      user = await User.findOne({ where: { phone: userPhone } });
      console.log(`📞 [${sessionId}] User lookup by phone ${userPhone}:`, user ? user.name : 'not found');
    }
    
    // If no user found by phone, try to get from call data (fallback)
    if (!user) {
      console.log(`⚠️ [${sessionId}] No user found, using default admin user`);
      user = await User.findOne({ where: { role: 'admin' } });
    }
    
    if (!user) {
      console.log(`❌ [${sessionId}] No user available for AI Tutor session`);
      return null;
    }
    
    // Start AI Tutor session (will auto-load first lesson from user's training)
    const result = await aiTutorService.startLessonSession(
      user.id,
      null, // null = auto-load first lesson from training_type
      sessionId
    );
    
    if (result.success) {
      console.log(`✅ [${sessionId}] AI Tutor session initialized for user: ${user.name}`);
      return {
        user,
        tutorSession: result.sessionData,
        introMessage: result.introductionMessage
      };
    } else {
      console.log(`❌ [${sessionId}] Failed to initialize AI Tutor session`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ [${sessionId}] Error initializing AI Tutor session:`, error);
    return null;
  }
}

/**
 * Enhanced Twilio WebSocket route with AI Tutor integration and barge-in
 */
router.ws('/stream', async (ws, req) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`🎯 [${sessionId}] NEW Enhanced Twilio WebSocket - AI TUTOR + BARGE-IN`);
  
  let currentUser = null;
  let tutorSession = null;
  let callSid = null;
  let streamSid = null;
  let userPhone = null;
  
  // Direct OpenAI WebSocket connection with barge-in support
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error(`❌ [${sessionId}] Missing OpenAI API key`);
    ws.close();
    return;
  }
  
  console.log(`🔗 [${sessionId}] Connecting to OpenAI Realtime API with barge-in...`);
  
  const openAiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );
  
  // Function to send session configuration to OpenAI
  const sendSessionUpdate = () => {
    const sessionUpdate = {
      type: 'session.update',
      session: {
        turn_detection: { 
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        voice: VOICE,
        instructions: SYSTEM_MESSAGE,
        modalities: ["text", "audio"],
        temperature: 0.8,
        input_audio_transcription: {
          model: 'whisper-1'
        }
      }
    };
    
    console.log(`📤 [${sessionId}] Sending enhanced session config with barge-in`);
    openAiWs.send(JSON.stringify(sessionUpdate));
  };
  
  // OpenAI WebSocket event handlers
  openAiWs.on('open', () => {
    console.log(`✅ [${sessionId}] Connected to OpenAI Realtime API`);
    setTimeout(sendSessionUpdate, 250); // Send session config after connection stabilizes
  });
  
  openAiWs.on('message', async (data) => {
    try {
      const response = JSON.parse(data);
      
      // Handle conversation transcription for AI Tutor integration
      if (response.type === 'conversation.item.input_audio_transcription.completed') {
        const userMessage = response.transcript;
        console.log(`🗣️ [${sessionId}] User said: "${userMessage}"`);
        
        // Process with AI Tutor service if we have an active session
        if (tutorSession && currentUser) {
          try {
            const tutorResponse = await aiTutorService.processUserMessage(
              sessionId, 
              userMessage, 
              currentUser.id
            );
            
            console.log(`🎓 [${sessionId}] AI Tutor response: ${tutorResponse.phase}`);
            
            // Send tutor context to OpenAI for better responses
            if (tutorResponse.message) {
              const contextMessage = {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'system',
                  content: [{
                    type: 'text',
                    text: `KONTEXT LEKCE: Fáze: ${tutorResponse.phase}. Odpověz uživateli: ${tutorResponse.message}`
                  }]
                }
              };
              
              openAiWs.send(JSON.stringify(contextMessage));
              
              // Trigger response generation
              const responseCreate = {
                type: 'response.create',
                response: {
                  modalities: ['audio'],
                  voice: VOICE
                }
              };
              openAiWs.send(JSON.stringify(responseCreate));
            }
            
          } catch (error) {
            console.error(`❌ [${sessionId}] AI Tutor error:`, error);
          }
        }
      }
      
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
      
      // Handle barge-in events
      if (response.type === 'input_audio_buffer.speech_started') {
        console.log(`🎙️ [${sessionId}] User started speaking - barge-in detected`);
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
    
    // Clean up tutor session
    if (tutorSession) {
      aiTutorService.endSession(sessionId);
    }
  });
  
  // Twilio WebSocket event handlers
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.event) {
        case 'connected':
          console.log(`🔌 [${sessionId}] Connected to Twilio Media Stream`);
          break;
          
        case 'start':
          streamSid = data.streamSid;
          callSid = data.start?.callSid;
          
          console.log(`🎬 [${sessionId}] Stream started: ${streamSid}`);
          console.log(`📞 [${sessionId}] Call SID: ${callSid}`);
          
          // Extract phone numbers from call data
          const fromPhone = data.start?.customParameters?.From || data.start?.from;
          const toPhone = data.start?.customParameters?.To || data.start?.to;
          
          console.log(`📱 [${sessionId}] Phone numbers - From: ${fromPhone}, To: ${toPhone}`);
          
          // Use the caller's phone number to find user
          userPhone = fromPhone;
          
          // Initialize AI Tutor session when call starts
          const tutorInit = await initializeTutorSession(callSid, sessionId, userPhone);
          if (tutorInit) {
            currentUser = tutorInit.user;
            tutorSession = tutorInit.tutorSession;
            
            console.log(`🎓 [${sessionId}] AI Tutor ready for user: ${currentUser.name}`);
            
            // Send initial lesson introduction to OpenAI
            if (tutorInit.introMessage) {
              const introMessage = {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'system',
                  content: [{
                    type: 'text',
                    text: `ZAČÁTEK LEKCE: ${tutorInit.introMessage}`
                  }]
                }
              };
              
              openAiWs.send(JSON.stringify(introMessage));
              
              // Trigger initial response
              const responseCreate = {
                type: 'response.create',
                response: {
                  modalities: ['audio'],
                  voice: VOICE
                }
              };
              openAiWs.send(JSON.stringify(responseCreate));
            }
          } else {
            console.log(`⚠️ [${sessionId}] No AI Tutor session - using default behavior`);
          }
          break;
          
        case 'media':
          // Forward audio to OpenAI with barge-in support
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
    
    // Clean up tutor session
    if (tutorSession) {
      aiTutorService.endSession(sessionId);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [${sessionId}] Twilio WebSocket error:`, error);
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.close();
    }
  });
});

/**
 * GET/POST /voice
 * Twilio webhook pro příchozí hovory - Enhanced with proper Railway URL
 */
router.get('/voice', (req, res) => {
  const { CallSid, From, To } = req.query;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`🚨 [${requestId}] ENHANCED TWILIO VOICE WEBHOOK (GET) 🚨`);
  console.log(`[${requestId}] 📞 Incoming call:`, { CallSid, From, To });

  // Get Railway URL correctly
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || 
                  process.env.APP_BASE_URL || 
                  `${req.get('host')}`;
  
  // Remove protocol if present
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '');
  const wsUrl = `wss://${cleanBaseUrl}/api/webrtc/stream`;

  // Enhanced TwiML with proper Connect for bidirectional stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v AI Lektor systému. Připojuji vás k vašemu osobnímu školiteli.
  </Say>
  <Connect>
    <Stream 
      name="ai_tutor_stream"
      url="${wsUrl}"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 WebSocket URL: ${wsUrl}`);
  console.log(`[${requestId}] 📄 Enhanced TwiML sent`);
  
  res.type('text/xml');
  res.send(twiml);
});

router.post('/voice', (req, res) => {
  const { CallSid, From, To } = req.body;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`🚨 [${requestId}] ENHANCED TWILIO VOICE WEBHOOK (POST) 🚨`);
  console.log(`[${requestId}] 📞 Incoming call:`, { CallSid, From, To });

  // Get Railway URL correctly
  const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || 
                  process.env.APP_BASE_URL || 
                  `${req.get('host')}`;
  
  // Remove protocol if present
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '');
  const wsUrl = `wss://${cleanBaseUrl}/api/webrtc/stream`;

  // Enhanced TwiML with proper Connect for bidirectional stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.cs-CZ-Standard-A" language="cs-CZ">
    Vítejte v AI Lektor systému. Připojuji vás k vašemu osobnímu školiteli.
  </Say>
  <Connect>
    <Stream 
      name="ai_tutor_stream"
      url="${wsUrl}"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 WebSocket URL: ${wsUrl}`);
  console.log(`[${requestId}] 📄 Enhanced TwiML sent`);
  
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /status
 * Webhook pro status update hovorů
 */
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, Duration } = req.body;
  console.log(`📊 Call status update: ${CallSid} - ${CallStatus} (${Duration}s)`);
  res.sendStatus(200);
});

module.exports = router; 