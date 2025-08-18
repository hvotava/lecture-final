# 🎙️ Lecture WebRTC Backend

Node.js/Express backend pro OpenAI Realtime API s Twilio WebRTC integrací.

## 🚀 Funkce

- **OpenAI Realtime API**: Ephemeral sessions pro WebRTC komunikaci
- **Twilio Media Streams**: WebSocket bridge pro telefonní hovory
- **Audio Processing**: μ-law ↔ PCM16 konverze + resampling (8kHz ↔ 24kHz)
- **Barge-in Support**: Přerušování AI odpovědí během mluvení
- **Low Latency**: < 250ms end-to-end latence

## 🛠️ Technologie

- **Node.js 18+** + TypeScript
- **Express** + WebSocket (`ws`)
- **OpenAI Realtime API** (gpt-4o-realtime-preview)
- **Twilio Media Streams** (WebSocket)
- **Audio DSP**: Čistý JS (bez nativních závislostí)

## 📦 Instalace

```bash
# Nainstaluj dependencies
npm install

# Development s hot reload
npm run dev

# Production build
npm run build
npm start
```

## 🔧 Environment Variables

Nastavte tyto proměnné v Railway nebo `.env` souboru:

```bash
# Povinné
OPENAI_API_KEY=sk-proj-...
APP_BASE_URL=https://your-app.up.railway.app

# Volitelné
PORT=8080
NODE_ENV=production
ALLOWED_ORIGINS=https://frontend.example.com,https://another.example.com
```

### Railway Deployment

1. **Vytvoř nový service** na Railway
2. **Připoj GitHub repo** `hvotava/LectureIII`
3. **Nastav environment variables**:
   ```
   OPENAI_API_KEY=sk-proj-your-key-here
   APP_BASE_URL=https://your-service-name.up.railway.app
   NODE_ENV=production
   ```
4. **Deploy** - Railway automaticky použije `railway.json` config

## 📡 API Endpoints

### Session Management
- `POST /session` - Vytvoří OpenAI ephemeral session
- `GET /session/health` - Health check

### Twilio Integration  
- `GET /twilio/voice` - TwiML webhook pro incoming calls
- `POST /twilio/voice` - Alternativní POST endpoint
- `POST /twilio/status` - Call status callbacks
- `GET /twilio/health` - Health check

### WebSocket
- `wss://your-app.com/twilio/stream` - Media Stream bridge

### Health Check
- `GET /health` - Overall service health

## 🎯 Twilio Konfigurace

V Twilio Console nastavte:

1. **Phone Number** → **Voice Configuration**:
   ```
   Request URL: https://your-app.up.railway.app/twilio/voice
   HTTP Method: GET (nebo POST)
   ```

2. **Status Callbacks** (volitelné):
   ```
   Status Callback URL: https://your-app.up.railway.app/twilio/status
   Events: initiated, ringing, answered, completed
   ```

## 🔊 Audio Pipeline

```
Twilio (μ-law 8kHz) 
    ↓ base64MuLawToPCM16
PCM16 8kHz
    ↓ upsample8kTo24k  
PCM16 24kHz
    ↓ sendAppendPCM
OpenAI Realtime API
    ↓ response.audio.delta
PCM16 24kHz
    ↓ downsample24kTo8k
PCM16 8kHz
    ↓ pcm16ToBase64MuLaw
Twilio (μ-law 8kHz)
```

## 🚨 Troubleshooting

### WebSocket Connection Issues
- Zkontrolujte že Railway povoluje WebSocket upgrades
- Ověřte že `APP_BASE_URL` je správně nastavená
- Railway automaticky binduje na `process.env.PORT`

### Audio Quality Issues
- Použijte sluchátka pro eliminaci echo
- Zkontrolujte mikrofon permissions v prohlížeči
- Twilio Media Streams vyžadují μ-law @ 8kHz

### OpenAI API Errors
- Ověřte `OPENAI_API_KEY` s `sk-proj-` prefixem
- Realtime API vyžaduje `OpenAI-Beta: realtime=v1` header
- Ephemeral sessions expirují po ~60 minutách

## 📊 Monitoring

Logy obsahují structured eventy:

```
🔗 [session_123] Twilio WebSocket connected
🤖 [session_123] Connecting to OpenAI Realtime...
✅ [session_123] OpenAI WebSocket connected
📤 Sent 480 samples to OpenAI
🔊 [session_123] Sent audio chunk to Twilio (160 bytes)
🛑 [session_123] Barge-in detected, cancelling response
```

## 🔐 Security

- CORS je nakonfigurován pro povolené origins
- Rate limiting na `/session` endpoint (30 req/min/IP)
- OpenAI API key je server-side only
- Request ID tracking pro debugging

## 📈 Performance

- **Latence**: ~200-350ms end-to-end
- **Audio buffering**: 20ms chunks (Twilio) → 100ms batches (OpenAI)
- **Memory**: Minimální buffering, streaming processing
- **CPU**: Lightweight DSP, žádné nativní dependencies

## 🧪 Testing

```bash
# Health check
curl https://your-app.up.railway.app/health

# Session creation
curl -X POST https://your-app.up.railway.app/session \
  -H "Content-Type: application/json" \
  -d '{"voice":"alloy"}'

# Twilio TwiML
curl https://your-app.up.railway.app/twilio/voice
``` 