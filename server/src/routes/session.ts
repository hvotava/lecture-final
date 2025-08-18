import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../index';

const router = express.Router();

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

// Request schema validation
const createSessionSchema = z.object({
  instructions: z.string().optional(),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  temperature: z.number().min(0).max(2).default(0.8),
  max_response_output_tokens: z.number().min(1).max(4096).default(4096),
});

/**
 * POST /session
 * Vytvoří ephemeral session pro OpenAI Realtime API
 */
router.post('/', sessionRateLimit, async (req, res) => {
  try {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`[${requestId}] 🔑 Creating OpenAI session...`);

    // Validate request body
    const body = createSessionSchema.parse(req.body);

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
      voice: body.voice,
      modalities: ['text', 'audio'],
      instructions: body.instructions || defaultInstructions,
      temperature: body.temperature,
      max_response_output_tokens: body.max_response_output_tokens,
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
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
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

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
        requestId
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });
  }
});

/**
 * GET /session/health
 * Health check pro session endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoint: '/session',
    rateLimit: '30 req/min',
    timestamp: new Date().toISOString()
  });
});

export default router; 