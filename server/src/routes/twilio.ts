import express from 'express';
import { env } from '../index';

const router = express.Router();

/**
 * GET /twilio/voice
 * Twilio Voice webhook - vrací TwiML pro Media Stream
 */
router.get('/voice', (req, res) => {
  const { CallSid, From, To } = req.query;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`[${requestId}] 📞 Incoming Twilio call:`, { CallSid, From, To });

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = env.APP_BASE_URL.replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/twilio/stream`;

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
      track="both_tracks"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 TwiML WebSocket URL: ${wsUrl}`);
  
  // Vrať TwiML jako XML
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /twilio/voice  
 * Alternativní endpoint pro POST requests z Twilio
 */
router.post('/voice', (req, res) => {
  const { CallSid, From, To } = req.body;
  const requestId = req.headers['x-request-id'] || `twilio_${Date.now()}`;
  
  console.log(`[${requestId}] 📞 Incoming Twilio call (POST):`, { CallSid, From, To });

  // Získej base URL bez https:// pro WebSocket
  const baseUrl = env.APP_BASE_URL.replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/twilio/stream`;

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
      track="both_tracks"
    />
  </Connect>
</Response>`;

  console.log(`[${requestId}] 📡 TwiML WebSocket URL: ${wsUrl}`);
  
  // Vrať TwiML jako XML
  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /twilio/status
 * Twilio status callback webhook
 */
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, Duration } = req.body;
  const requestId = req.headers['x-request-id'] || `status_${Date.now()}`;
  
  console.log(`[${requestId}] 📊 Call status update:`, { 
    CallSid, 
    CallStatus, 
    Duration: Duration ? `${Duration}s` : 'N/A'
  });

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
});

/**
 * GET /twilio/health
 * Health check pro Twilio endpoints
 */
router.get('/health', (req, res) => {
  const baseUrl = env.APP_BASE_URL.replace(/^https?:\/\//, '');
  
  res.json({
    status: 'healthy',
    endpoints: {
      voice: `${env.APP_BASE_URL}/twilio/voice`,
      stream: `wss://${baseUrl}/twilio/stream`,
      status: `${env.APP_BASE_URL}/twilio/status`
    },
    timestamp: new Date().toISOString()
  });
});

export default router; 