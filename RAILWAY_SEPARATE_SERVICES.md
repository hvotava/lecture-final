# Railway Separate Services Setup

## 🎯 Cíl: 2 samostatné Railway services

### Service 1: Python WebRTC Backend (AKTUÁLNÍ)
- **Název:** `lecture-webrtc-backend`
- **Repository:** Současný (hlavní branch)
- **Port:** 8080
- **Účel:** WebRTC endpoints, OpenAI Realtime API

### Service 2: Node.js Frontend Dashboard (NOVÝ)
- **Název:** `lecture-dashboard-frontend` 
- **Repository:** Stejný, ale s jinou konfigurací
- **Port:** 5000
- **Účel:** React dashboard, user management

## 🔧 Postup vytvoření

### Krok A: Aktuální service (už hotový)
1. ✅ Python backend běží na Railway
2. ✅ WebRTC endpoints fungují
3. ✅ CORS nastaven pro cross-service komunikaci

### Krok B: Vytvoření nového Node.js service

1. **Jděte na Railway dashboard**
2. **Klikněte "New Project"**
3. **Connect GitHub repository** - stejný repo
4. **Nastavte název:** `lecture-dashboard-frontend`

5. **Nastavte environment variables:**
   ```
   NODE_ENV=production
   PYTHON_WEBRTC_BACKEND_URL=https://lecture-webrtc-backend.up.railway.app
   DATABASE_URL=<stejná jako Python service>
   TWILIO_ACCOUNT_SID=<stejná>
   TWILIO_AUTH_TOKEN=<stejná>
   TWILIO_PHONE_NUMBER=<stejná>
   ```

6. **Nahraďte konfigurační soubory:**
   - Přejmenujte `railway-frontend.json` → `railway.json`
   - Přejmenujte `nixpacks-frontend.toml` → `nixpacks.toml`
   - Přejmenujte `Procfile-frontend` → `Procfile`

7. **Deploy service**

### Krok C: Testování
1. **Frontend URL:** `https://lecture-dashboard-frontend.up.railway.app`
2. **Backend URL:** `https://lecture-webrtc-backend.up.railway.app`
3. **Telefon ikonka** → volá Python WebRTC backend
4. **WebRTC barge-in** funguje!

## 🔄 Flow po dokončení

```
👨‍💼 Uživatel → React Dashboard (Node.js service)
                    ↓ telefon ikonka
📞 Twilio call → Python WebRTC Backend
                    ↓
🧠 OpenAI Realtime API
                    ↓
🎯 PLNÝ BARGE-IN KONVERZACE!
```

## 📝 Poznámky
- Oba services sdílejí stejnou databázi
- Cross-service komunikace přes HTTPS
- Frontend volá backend API endpoints
- WebRTC zůstává v Python service 