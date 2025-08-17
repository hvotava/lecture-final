# WebRTC Implementace - Nasazení a konfigurace

## Přehled

Tato implementace přepracovává stávající propojení z OpenAI na Twilio tak, aby používalo WebRTC technologii místo standardního WebSocket řešení. WebRTC poskytuje:

- **Nižší latenci** - Přímé P2P spojení
- **Lepší kvalitu zvuku** - Pokročilé kodéky a adaptivní bitrate
- **Robustnější spojení** - Automatické obnovení připojení
- **Lepší škálovatelnost** - Menší zátěž serveru

## Architektura

```
Twilio Call → WebRTC Endpoint → WebRTC Service → OpenAI Realtime API
                    ↓
              WebRTC PeerConnection ← → Browser Client
```

### Komponenty

1. **Backend Services**
   - `WebRTCRealtimeService` - Hlavní WebRTC logika
   - `TwilioWebRTCHandler` - Twilio integrace
   - WebRTC routes - API endpointy

2. **Frontend Components**
   - `WebRTCPhone` - React komponenta pro hovory
   - `WebRTCDemo` - Demo stránka
   - WebRTC API integrace

3. **Node.js Backend**
   - `twilio-webrtc.js` routes
   - WebSocket server pro signaling
   - ICE server konfigurace

## Instalace

### 1. Backend Dependencies (Python)

```bash
pip install aiortc==1.6.0 aiofiles==23.2.1
```

### 2. Node.js Dependencies

```bash
cd react-dashboard/backend
npm install wrtc ws
```

### 3. Frontend Dependencies

Jsou již součástí stávajícího React projektu.

## Konfigurace

### 1. Environment Variables

Přidejte do `.env` souborů:

```bash
# Stávající OpenAI konfigurace
OPENAI_API_KEY=sk-...

# WebRTC konfigurace (volitelné)
WEBRTC_STUN_SERVER_1=stun:stun.l.google.com:19302
WEBRTC_STUN_SERVER_2=stun:stun1.l.google.com:19302

# Twilio konfigurace (stávající)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+420...
```

### 2. Twilio Webhook Konfigurace

Aktualizujte webhook URL pro WebRTC verzi:

**Stávající webhook:**
```
https://your-domain.com/voice/call
```

**Nový WebRTC webhook:**
```
https://your-domain.com/voice/webrtc
```

### 3. HTTPS Požadavky

WebRTC vyžaduje HTTPS pro produkční nasazení:
- Certifikát SSL/TLS
- Secure WebSocket (WSS) připojení
- CORS konfigurace pro WebRTC

## Nasazení

### 1. Railway Deployment

Aktualizujte `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 2. Dockerfile Updates

Přidejte do Dockerfile:

```dockerfile
# WebRTC dependencies
RUN apt-get update && apt-get install -y \
    libavdevice-dev \
    libavfilter-dev \
    libopus-dev \
    libvpx-dev \
    pkg-config

# Python WebRTC dependencies
RUN pip install aiortc aiofiles
```

### 3. Nginx Konfigurace (pokud používáte)

```nginx
location /webrtc-audio {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

## Testování

### 1. Lokální testování

```bash
# Spuštění Python serveru
python main.py

# Spuštění Node.js serveru
cd react-dashboard/backend
npm start

# Spuštění React frontend
cd react-dashboard/frontend  
npm start
```

### 2. WebRTC Demo

Navštivte: `http://localhost:3000/webrtc-demo`

### 3. Testovací hovory

1. Zavolejte na vaše Twilio číslo
2. Řekněte "WebRTC test"
3. Ověřte připojení a kvalitu zvuku

## Monitoring a Debugging

### 1. Logy

```bash
# Python logy
tail -f logs/webrtc.log

# Node.js logy  
tail -f logs/node.log

# Browser console
# Otevřete Developer Tools → Console
```

### 2. WebRTC Statistiky

```javascript
// V browser console
const stats = await peerConnection.getStats();
console.log(stats);
```

### 3. Diagnostické endpointy

- `GET /webrtc/status/:callSid` - Status spojení
- `GET /api/webrtc/diagnostics` - Systémové info
- `GET /health` - Health check

## Troubleshooting

### Časté problémy

1. **ICE Connection Failed**
   - Zkontrolujte STUN servery
   - Ověřte firewall nastavení
   - Zkuste jiný prohlížeč

2. **Audio Quality Issues**
   - Zkontrolujte kodéky
   - Ověřte bandwidth
   - Zkuste jiné audio formáty

3. **OpenAI Connection Timeout**
   - Zkontrolujte API klíč
   - Ověřte síťové připojení
   - Zkontrolujte rate limits

### Debug Commands

```bash
# Testování WebRTC podpory
curl -X POST http://localhost:8000/webrtc/offer \
  -H "Content-Type: application/json" \
  -d '{"callSid": "test"}'

# Testování OpenAI připojení
python -c "
import asyncio
from app.services.webrtc_realtime_service import WebRTCRealtimeService
async def test():
    service = WebRTCRealtimeService()
    await service.connect_to_openai('Test')
    print('OpenAI OK')
asyncio.run(test())
"
```

## Performance Optimizace

### 1. Server Optimizace

```python
# WebRTC service konfigurace
rtc_config = RTCConfiguration(
    iceServers=[
        RTCIceServer(urls="stun:stun.l.google.com:19302"),
        RTCIceServer(urls="turn:your-turn-server.com", 
                    username="user", credential="pass")
    ]
)
```

### 2. Audio Kodéky

Preferované kodéky pro nejlepší kvalitu:
- Opus (nejlepší pro hlasové hovory)
- G.722 (vysoká kvalita)
- G.711 (kompatibilita s Twilio)

### 3. Bandwidth Management

```javascript
// Omezení bandwidth
const offer = await peerConnection.createOffer();
offer.sdp = offer.sdp.replace(/b=AS:\d+/g, 'b=AS:64'); // 64 kbps
```

## Migrace ze stávající implementace

### 1. Postupná migrace

1. Nasaďte WebRTC verzi paralelně
2. Testujte s malým procentem hovorů
3. Postupně přesměrujte veškerý traffic
4. Odstraňte starou implementaci

### 2. Fallback mechanismus

```python
# V případě selhání WebRTC, použijte WebSocket
try:
    webrtc_service = WebRTCRealtimeService()
    await webrtc_service.connect_to_openai(context)
except Exception:
    # Fallback na WebSocket
    websocket_service = OpenAIRealtimeService()
    await websocket_service.connect_to_openai(context)
```

## Bezpečnost

### 1. HTTPS/WSS pouze

```python
# Vynutit HTTPS v produkci
if not request.is_secure and settings.ENVIRONMENT == 'production':
    return redirect(request.url.replace('http://', 'https://'))
```

### 2. CORS konfigurace

```python
from flask_cors import CORS

CORS(app, origins=[
    "https://your-domain.com",
    "https://webrtc.your-domain.com"
])
```

### 3. Rate limiting

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/webrtc/offer')
@limiter.limit("10 per minute")
def create_offer():
    # ...
```

## Závěr

WebRTC implementace poskytuje významné zlepšení v latenci a kvalitě zvuku oproti stávajícímu WebSocket řešení. Postupná migrace a důkladné testování zajistí hladký přechod na novou technologii.

Pro další podporu kontaktujte vývojový tým nebo vytvořte issue v GitHub repozitáři. 