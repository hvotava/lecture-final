const express = require('express');
const twilio = require('twilio');
const router = express.Router();

// Twilio VoiceResponse for handling voice calls
const VoiceResponse = twilio.twiml.VoiceResponse;

// Voice webhook - REDIRECT TO WEBRTC HANDLER
router.post('/voice', (req, res) => {
  console.log('🚨🚨🚨 OLD TWILIO ROUTE /api/twilio/voice CALLED! 🚨🚨🚨');
  console.log('🔄 REDIRECTING TO NEW WEBRTC HANDLER...');
  console.log('📋 Body:', req.body);
  
  const { CallSid, From, To } = req.body;
  const requestId = req.headers['x-request-id'] || `twilio_redirect_${Date.now()}`;
  
  console.log(`[${requestId}] 📞 Redirecting Twilio call to WebRTC handler:`, { CallSid, From, To });

  // Use the same WebRTC TwiML logic
  const baseUrl = (process.env.APP_BASE_URL || `https://${req.get('host')}`).replace(/^https?:\/\//, '');
  const wsUrl = `wss://${baseUrl}/api/webrtc/stream`;

  // TwiML response s Media Stream - SAME AS WEBRTC HANDLER
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

  console.log(`[${requestId}] 📡 WebSocket URL:`, wsUrl);
  console.log(`[${requestId}] 📄 TwiML Response:`, twiml);
  
  // Return TwiML as XML
  res.type('text/xml');
  res.send(twiml);
});

// Handle user input from voice menu
router.post('/gather', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;
  const callerNumber = req.body.From;
  
  // Determine language
  let language = 'cs-CZ';
  let voice = 'Google.cs-CZ-Standard-A';
  
  if (callerNumber && callerNumber.startsWith('+421')) {
    language = 'sk-SK';
    voice = 'Google.sk-SK-Standard-A';
  } else if (callerNumber && callerNumber.startsWith('+1')) {
    language = 'en-US';
    voice = 'Google.en-US-Standard-A';
  }
  
  switch (digit) {
    case '1':
      // Start lesson
      twiml.say({
        voice: voice,
        language: language
      }, getStartLessonMessage(language));
      break;
      
    case '2':
      // Take test
      twiml.say({
        voice: voice,
        language: language
      }, getStartTestMessage(language));
      break;
      
    case '3':
      // Progress info
      twiml.say({
        voice: voice,
        language: language
      }, getProgressMessage(language));
      break;
      
    case '0':
      // Speak with human
      twiml.say({
        voice: voice,
        language: language
      }, getTransferMessage(language));
      // Here you could transfer to a human agent
      break;
      
    default:
      twiml.say({
        voice: voice,
        language: language
      }, getInvalidInputMessage(language));
      twiml.redirect('/api/twilio/voice');
      break;
  }
  
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Status callback for call monitoring
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  const from = req.body.From;
  const to = req.body.To;
  
  console.log(`📞 Twilio Call Status Update:
    SID: ${callSid}
    Status: ${callStatus}
    From: ${from}
    To: ${to}
    Duration: ${req.body.CallDuration || 'N/A'}s
  `);
  
  // You could save call logs to database here
  // await CallLog.create({ callSid, status: callStatus, from, to, duration: req.body.CallDuration });
  
  res.sendStatus(200);
});

// Helper functions for multi-language messages
function getWelcomeMessage(language) {
  const messages = {
    'cs-CZ': 'Vítejte v systému Lecture. Jsem váš AI asistent pro vzdělávání.',
    'sk-SK': 'Vitajte v systéme Lecture. Som váš AI asistent pre vzdelávanie.',
    'en-US': 'Welcome to the Lecture system. I am your AI learning assistant.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getMenuMessage(language) {
  const messages = {
    'cs-CZ': 'Stiskněte 1 pro zahájení lekce, 2 pro test, 3 pro informace o pokroku, nebo 0 pro spojení s operátorem.',
    'sk-SK': 'Stlačte 1 pre začatie lekcie, 2 pre test, 3 pre informácie o pokroku, alebo 0 pre spojenie s operátorom.',
    'en-US': 'Press 1 to start a lesson, 2 for a test, 3 for progress information, or 0 to speak with an operator.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getTimeoutMessage(language) {
  const messages = {
    'cs-CZ': 'Neobdrželi jsme žádný vstup. Opakuji možnosti.',
    'sk-SK': 'Nedostali sme žiadny vstup. Opakujem možnosti.',
    'en-US': 'We did not receive any input. Repeating options.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getStartLessonMessage(language) {
  const messages = {
    'cs-CZ': 'Zahajuji vaši další lekci. Pokračujte ve svém webovém prohlížeči nebo mobilní aplikaci pro interaktivní obsah.',
    'sk-SK': 'Začínam vašu ďalšiu lekciu. Pokračujte vo svojom webovom prehliadači alebo mobilnej aplikácii pre interaktívny obsah.',
    'en-US': 'Starting your next lesson. Please continue in your web browser or mobile app for interactive content.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getStartTestMessage(language) {
  const messages = {
    'cs-CZ': 'Připravuji váš test. Prosím, otevřete webovou aplikaci pro dokončení testu.',
    'sk-SK': 'Pripravujem váš test. Prosím, otvorte webovú aplikáciu pre dokončenie testu.',
    'en-US': 'Preparing your test. Please open the web application to complete the test.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getProgressMessage(language) {
  const messages = {
    'cs-CZ': 'Váš aktuální pokrok je dostupný ve webové aplikaci. Pokračujte ve svém tempě učení.',
    'sk-SK': 'Váš aktuálny pokrok je dostupný vo webovej aplikácii. Pokračujte vo svojom tempe učenia.',
    'en-US': 'Your current progress is available in the web application. Continue learning at your own pace.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getTransferMessage(language) {
  const messages = {
    'cs-CZ': 'Přepojuji vás na lidského operátora. Prosím, čekejte.',
    'sk-SK': 'Prepájam vás na ľudského operátora. Prosím, čakajte.',
    'en-US': 'Transferring you to a human operator. Please wait.'
  };
  return messages[language] || messages['cs-CZ'];
}

function getInvalidInputMessage(language) {
  const messages = {
    'cs-CZ': 'Neplatná volba. Prosím, zkuste to znovu.',
    'sk-SK': 'Neplatná voľba. Prosím, skúste to znovu.',
    'en-US': 'Invalid choice. Please try again.'
  };
  return messages[language] || messages['cs-CZ'];
}

module.exports = router; 
// NEW: Voice call endpoint for AI assistant - WORKING VERSION
router.post('/voice/call', (req, res) => {
  console.log('🎯 NEW Voice/call handler (without test messages)');
  console.log('📝 Request body:', req.body);
  
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="cs-CZ" rate="0.9" voice="Google.cs-CZ-Standard-A">
        AI Asistent připraven. Mluvte prosím.
    </Say>
    <Record 
        timeout="10"
        maxLength="30"
        action="https://lecture-final-production.up.railway.app/api/twilio/voice/process"
        method="POST"
        transcribe="true"
        transcribeCallback="https://lecture-final-production.up.railway.app/api/twilio/voice/transcribe"
    />
    <Say language="cs-CZ" rate="0.9" voice="Google.cs-CZ-Standard-A">
        Děkuji. Zpracovávám odpověď.
    </Say>
</Response>`;

  console.log('✅ NEW TwiML response (NO TEST MESSAGES)');
  res.set('Content-Type', 'application/xml');
  res.send(twimlResponse);
});

// Voice processing endpoint - handles recorded speech
router.post('/voice/process', async (req, res) => {
  console.log('🎙️ Voice processing called');
  console.log('📝 Request body:', req.body);
  console.log('🎵 RecordingUrl:', req.body.RecordingUrl);
  
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="cs-CZ" rate="0.9" voice="Google.cs-CZ-Standard-A">
        Děkuji za vaši odpověď. Pokračujte v konverzaci nebo stiskněte hvězdičku pro ukončení.
    </Say>
    <Record 
        timeout="10"
        maxLength="30"
        action="https://lecture-final-production.up.railway.app/api/twilio/voice/process"
        method="POST"
        transcribe="true"
        transcribeCallback="https://lecture-final-production.up.railway.app/api/twilio/voice/transcribe"
    />
</Response>`;

  console.log('✅ Process TwiML response sent');
  res.set('Content-Type', 'application/xml');
  res.send(twimlResponse);
});

// Transcription callback - handles speech-to-text results
router.post('/voice/transcribe', async (req, res) => {
  console.log('📝 Transcription callback received');
  console.log('🎯 CallSid:', req.body.CallSid);
  console.log('📄 TranscriptionText:', req.body.TranscriptionText);
  console.log('📊 TranscriptionStatus:', req.body.TranscriptionStatus);
  
  // Here we could process the transcribed text and generate AI response
  const transcribedText = req.body.TranscriptionText;
  if (transcribedText) {
    console.log(`�� User said: "${transcribedText}"`);
    // TODO: Send to AI for processing and generate response
  }
  
  res.send('OK');
});

// Import intelligent voice handler
const { intelligentVoiceCall } = require('./twilio-voice-intelligent');

// REPLACE the simple voice/call with intelligent version
router.post('/voice/call-intelligent', (req, res) => {
  console.log('🚨 DEBUG: /voice/call-intelligent route HIT!');
  console.log('🚨 DEBUG: Request headers:', req.headers);
  console.log('🚨 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  return intelligentVoiceCall(req, res);
});

// Import smart voice processors
const { smartVoiceProcess, smartTranscribeProcess, recordingStatusCallback } = require('./smart-voice-process');

// Replace basic endpoints with SMART versions
router.post('/voice/process-smart', smartVoiceProcess);
router.post('/voice/transcribe-smart', smartTranscribeProcess);
router.post('/voice/recording-status', recordingStatusCallback);

// CRITICAL: Add Twilio status callback endpoint
router.post('/status', (req, res) => {
  console.log('📞 Twilio Call Status Update:');
  console.log('    SID:', req.body.CallSid);
  console.log('    Status:', req.body.CallStatus);
  console.log('    From:', req.body.From);
  console.log('    To:', req.body.To);
  console.log('    Duration:', req.body.CallDuration, 'seconds');
  console.log('  ');
  
  // Send OK response
  res.status(200).send('OK');
});
