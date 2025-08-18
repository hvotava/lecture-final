# 🔄 Migrace z Python na Node.js Backend

## 🎯 Cíl

**Nahradit Python backend** (lecture-app-production) **Node.js backendem** s integrovanými WebRTC funkcionalitami.

## 📋 Co se změnilo

### **PŘED (Python + Node.js):**
```
📱 React Frontend
    ↓ HTTP calls
🌐 Node.js Dashboard Backend (Railway)
    ↓ Proxy některé calls
🐍 Python Backend (Railway) ← ODSTRANIT
    ↓ WebSocket/API
🤖 OpenAI + Database
```

### **PO (Pouze Node.js):**
```
📱 React Frontend
    ↓ HTTP calls
🌐 Node.js Backend s WebRTC (Railway) ← UPGRADED
    ↓ WebSocket + API
🤖 OpenAI Realtime + Database
```

## 🚀 Migration Steps

### **STEP 1: Aktualizace Railway Service**

**V Railway Dashboard:**

1. **Otevřete stávající Node.js service** (lecture-dashboard-frontend nebo podobný)
2. **Settings** → **Build**:
   ```
   Root Directory: react-dashboard/backend
   Build Command: npm ci
   Start Command: npm start
   ```
3. **Variables** → **Přidejte WebRTC proměnné**:
   ```bash
   # Stávající proměnné zachovat + přidat:
   OPENAI_API_KEY=sk-proj-your-actual-api-key
   APP_BASE_URL=https://your-nodejs-service.up.railway.app
   NODE_ENV=production
   ```

### **STEP 2: Twilio Webhook Update**

**V Twilio Console:**
1. **Phone Numbers** → vyberte vaše číslo
2. **Voice Configuration**:
   ```
   Request URL: https://your-nodejs-service.up.railway.app/api/webrtc/voice
   HTTP Method: GET
   ```
3. **Save Configuration**

### **STEP 3: Frontend Update**

**Environment Variables** (pokud máte separate frontend):
```bash
REACT_APP_BACKEND_URL=https://your-nodejs-service.up.railway.app
```

### **STEP 4: Database Migration**

**Node.js backend už má Sequelize**, takže databáze zůstává stejná. Žádná migrace není potřeba.

### **STEP 5: Python Backend Removal**

**Po ověření že vše funguje:**
1. **Railway Dashboard** → Python service (lecture-app-production)
2. **Settings** → **Danger Zone** → **Delete Service**

## ✅ Verification Checklist

### **Test 1: Health Check**
```bash
curl https://your-nodejs-service.up.railway.app/health
```
**Expected**: `{"status":"ok"}`

### **Test 2: WebRTC Session**
```bash
curl -X POST https://your-nodejs-service.up.railway.app/api/webrtc/session \
  -H "Content-Type: application/json" \
  -d '{"voice":"alloy"}'
```
**Expected**: `{"success":true,"session":{...}}`

### **Test 3: Dashboard Login**
1. Otevřete React dashboard
2. Přihlaste se
3. Zkontrolujte že data se načítají

### **Test 4: WebRTC Voice Call**
1. **Users** → klikněte na telefon ikonku
2. **WebRTC dialog** se otevře
3. **"Spustit hovor"** → test WebRTC připojení

### **Test 5: Twilio Phone Call**
1. Zavolejte na vaše Twilio číslo
2. Měli byste slyšet: "Vítejte v interaktivním školení..."
3. Poté se připojí WebRTC stream s OpenAI

## 🔧 Environment Variables

### **Povinné pro WebRTC:**
```bash
OPENAI_API_KEY=sk-proj-your-openai-key
APP_BASE_URL=https://your-service.up.railway.app
```

### **Stávající (zachovat):**
```bash
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+420...
JWT_SECRET=...
# ... ostatní
```

## 🎯 Nové Funkcionality

### **WebRTC Endpoints:**
- `POST /api/webrtc/session` - OpenAI ephemeral sessions
- `GET /api/webrtc/voice` - Twilio TwiML webhook
- `POST /api/webrtc/status` - Twilio status callbacks
- `wss://host/api/webrtc/stream` - WebSocket pro Media Streams

### **Audio Processing:**
- **μ-law ↔ PCM16** konverze (Twilio ↔ OpenAI)
- **8kHz ↔ 24kHz** resampling
- **Barge-in support** - přerušování AI během mluvení
- **Low latency** < 250ms end-to-end

### **Dashboard Integration:**
- **WebRTC dialog** v UserManagement
- **VU-meter** pro audio level monitoring
- **Real-time status** indikace
- **Fallback Twilio** tlačítko pro backup

## 🚨 Troubleshooting

### **Build Errors:**
```bash
# Zkontrolujte že máte node-fetch dependency
cd react-dashboard/backend
npm install node-fetch@2.6.12
```

### **WebSocket Errors:**
```bash
# Railway automaticky podporuje WebSocket upgrades
# Zkontrolujte že APP_BASE_URL je správně nastavená
```

### **OpenAI API Errors:**
```bash
# Ověřte OPENAI_API_KEY
# Zkontrolujte že klíč má přístup k Realtime API
```

### **Database Connection:**
```bash
# DATABASE_URL by měla zůstat stejná
# Sequelize models jsou kompatibilní
```

## 📊 Monitoring

### **Key Log Messages:**
```
🚀 Server running on port 5000
🎧 WebSocket server ready for /api/webrtc/stream
🔗 [session_xxx] Twilio WebSocket connected
✅ [session_xxx] OpenAI WebSocket connected
🔊 [session_xxx] Sent audio chunk to Twilio
```

### **Error Patterns:**
```
❌ OpenAI API error: 401 Unauthorized → Check OPENAI_API_KEY
❌ Unknown WebSocket path → Check Twilio webhook URL
💥 Failed to connect to OpenAI → Check API key permissions
```

## 🎉 Success Metrics

Po úspěšné migraci budete mít:

- ✅ **1 Railway service** místo 2-3
- ✅ **WebRTC hovory** s AI asistentem
- ✅ **Nižší latenci** < 250ms
- ✅ **Barge-in support** 
- ✅ **Stejnou funkcionalnost** dashboardu
- ✅ **Nižší náklady** (méně services)

**Migration completed! 🚀** 