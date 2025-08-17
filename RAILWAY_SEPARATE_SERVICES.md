# Railway Separate Services Setup

## 🎯 Cíl: 2 samostatné Railway services

### Service 1: Python WebRTC Backend (AKTUÁLNÍ)
- **Název:** `lecture-app-production` (nebo jak se jmenuje váš současný service)
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
   PYTHON_WEBRTC_BACKEND_URL=https://lecture-app-production.up.railway.app
   DATABASE_URL=<stejná jako Python service>
   TWILIO_ACCOUNT_SID=<stejná>
   TWILIO_AUTH_TOKEN=<stejná>
   TWILIO_PHONE_NUMBER=<stejná>
   ```

6. **V Railway service settings:**
   - **Build:** Nixpacks
   - **Root Directory:** `/` (celý repo)
   - **Build Command:** `cd react-dashboard/frontend && npm ci && npm run build && cd ../backend && npm ci`
   - **Start Command:** `cd react-dashboard/backend && npm start`

   **NEBO použijte konfigurační soubory:**
   - Přejmenujte `railway-nodejs.json` → `railway.json` (dočasně)
   - Přejmenujte `nixpacks-nodejs.toml` → `nixpacks.toml` (dočasně)  
   - Přejmenujte `Procfile-nodejs` → `Procfile` (dočasně)

7. **Deploy service**

### Krok C: Testování
1. **Frontend URL:** `https://lecture-dashboard-frontend.up.railway.app`
2. **Backend URL:** `https://lecture-app-production.up.railway.app`
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