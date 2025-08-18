# 🚂 WebRTC Backend Deployment na Railway

## 🎯 Cíl

Nasadit **Node.js WebRTC backend** jako **nový service** na Railway vedle stávajícího Python backendu.

## 📋 Přehled Serviců

Po deployment budete mít **3 services** na Railway:

1. **lecture-app-production** (Python) - stávající backend
2. **lecture-webrtc-backend** (Node.js) - nový WebRTC backend  
3. **lecture-dashboard-frontend** (Node.js) - React dashboard

## 🚀 Deployment Kroky

### **STEP 1: Vytvoření nového Railway Service**

1. **Otevřete Railway Dashboard**: https://railway.app/dashboard
2. **Vyberte svůj projekt** (kde je lecture-app-production)
3. **Klikněte na "+ New Service"**
4. **Vyberte "GitHub Repo"**
5. **Vyberte repository**: `hvotava/LectureIII`
6. **Pojmenujte service**: `lecture-webrtc-backend`

### **STEP 2: Konfigurace Build**

Railway by mělo automaticky detekovat `server/` složku. Pokud ne:

1. **Settings** → **Build**
2. **Root Directory**: `server`
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`

### **STEP 3: Environment Variables**

V **Variables** sekci přidejte:

```bash
# Povinné
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
APP_BASE_URL=https://lecture-webrtc-backend.up.railway.app
NODE_ENV=production

# Volitelné (pro CORS)
ALLOWED_ORIGINS=https://lecture-dashboard-frontend.up.railway.app,https://lecture-app-production-5f70.up.railway.app
```

**⚠️ DŮLEŽITÉ**: Použijte svůj skutečný OpenAI API klíč!

### **STEP 4: Deploy**

1. **Deploy** - Railway začne build
2. **Čekejte na úspěšný deploy** (zelený status)
3. **Zkopírujte URL** vašeho nového service

## 🔧 Aktualizace Stávajícího Systému

### **STEP 5: Aktualizace Node.js Dashboard Backend**

V `lecture-dashboard-frontend` (nebo jak se jmenuje váš dashboard service):

1. **Variables** → přidejte:
```bash
WEBRTC_BACKEND_URL=https://lecture-webrtc-backend.up.railway.app
```

2. **Redeploy** dashboard service

### **STEP 6: Twilio Webhook Konfigurace**

1. **Twilio Console**: https://console.twilio.com/
2. **Phone Numbers** → vyberte vaše číslo
3. **Voice Configuration**:
   ```
   Request URL: https://lecture-webrtc-backend.up.railway.app/twilio/voice
   HTTP Method: GET
   ```
4. **Save**

## 🧪 Testování

### **Test 1: Health Check**
```bash
curl https://lecture-webrtc-backend.up.railway.app/health
```
**Očekávaný výsledek**:
```json
{
  "status": "healthy",
  "service": "lecture-webrtc-backend",
  "timestamp": "2025-01-XX...",
  "uptime": 123
}
```

### **Test 2: Session Creation**
```bash
curl -X POST https://lecture-webrtc-backend.up.railway.app/session \
  -H "Content-Type: application/json" \
  -d '{"voice":"alloy"}'
```

### **Test 3: Twilio TwiML**
```bash
curl https://lecture-webrtc-backend.up.railway.app/twilio/voice
```
**Očekávaný výsledek**: XML s `<Connect><Stream>` pro WebSocket

### **Test 4: WebRTC z Dashboardu**
1. **Otevřete React dashboard**
2. **Users** → klikněte na telefon ikonku
3. **WebRTC dialog** by se měl otevřít
4. **"Spustit hovor"** → test WebRTC připojení

## 🔍 Troubleshooting

### **Build Errors**
```bash
# Zkontrolujte logy v Railway dashboard
# Častá chyba: missing dependencies
```

### **Runtime Errors**
```bash
# Zkontrolujte že všechny env vars jsou nastavené
# Zejména OPENAI_API_KEY a APP_BASE_URL
```

### **WebSocket Connection Issues**
```bash
# Railway automaticky podporuje WebSocket
# Ověřte že APP_BASE_URL je správná (bez trailing slash)
```

### **CORS Errors**
```bash
# Přidejte frontend URL do ALLOWED_ORIGINS
# Nebo nastavte NODE_ENV=development pro dev režim
```

## 📊 Monitoring

### **Railway Logs**
- **Deployment logs**: Build process
- **Application logs**: Runtime eventy
- **Metrics**: CPU, Memory, Network

### **Klíčové Log Messages**
```
🚀 Server běží na portu 8080
📡 WebSocket endpoint: wss://your-app/twilio/stream
🔑 OpenAI API: sk-proj...
🎧 WebSocket server ready for /twilio/stream
```

## 🎯 Finální Architektura

```
📱 React Dashboard (Port 3000)
    ↓ HTTP calls
🌐 Node.js Dashboard Backend (Railway)
    ↓ WebRTC calls  
🎙️ Node.js WebRTC Backend (Railway) ← NOVÝ!
    ↓ WebSocket
🤖 OpenAI Realtime API

📞 Twilio Phone Number
    ↓ Webhook
🎙️ Node.js WebRTC Backend (Railway) ← NOVÝ!
    ↓ WebSocket Bridge
🤖 OpenAI Realtime API
```

## ✅ Success Checklist

- [ ] Railway service vytvořen
- [ ] Environment variables nastavené  
- [ ] Deployment úspěšný (zelený status)
- [ ] Health check endpoint funguje
- [ ] Session creation funguje
- [ ] Twilio webhook aktualizován
- [ ] Dashboard WebRTC dialog funguje
- [ ] Telefonní hovor funguje s WebRTC

**Po dokončení budete mít plně funkční WebRTC systém! 🎉** 