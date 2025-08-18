import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { z } from 'zod';

// Routes
import sessionRouter from './routes/session';
import twilioRouter from './routes/twilio';

// WebSocket handlers
import { setupTwilioWebSocket } from './ws/twilioStream';

// Middleware
import { errorHandler } from './middleware/errors';

// Environment validation
const envSchema = z.object({
  PORT: z.string().default('8080'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  APP_BASE_URL: z.string().url('APP_BASE_URL must be valid URL'),
  ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

const env = envSchema.parse(process.env);

// Express app
const app = express();
const server = createServer(app);

// CORS configuration
const allowedOrigins = env.ALLOWED_ORIGINS 
  ? env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: env.NODE_ENV === 'development' ? true : allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'lecture-webrtc-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/session', sessionRouter);
app.use('/twilio', twilioRouter);

// WebSocket setup pro /twilio/stream
setupTwilioWebSocket(server);

// Error handling
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server běží na portu ${PORT}`);
  console.log(`📡 WebSocket endpoint: wss://${env.APP_BASE_URL.replace('https://', '')}/twilio/stream`);
  console.log(`🎯 Environment: ${env.NODE_ENV}`);
  console.log(`🔑 OpenAI API: ${env.OPENAI_API_KEY.substring(0, 8)}...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { app, server, env }; 