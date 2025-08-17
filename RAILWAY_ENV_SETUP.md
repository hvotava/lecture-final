# Railway Environment Variables Setup

## Požadované Environment Variables

Pro správné fungování aplikace na Railway je potřeba nastavit následující environment variables v Railway dashboard:

### 1. Databáze
```
DATABASE_URL=postgresql://user:password@host:port/database
```
**Poznámka:** Railway automaticky poskytne PostgreSQL databázi a nastaví DATABASE_URL

### 2. OpenAI API
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Twilio konfigurace
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
TWILIO_ASSISTANT_ID=your_twilio_assistant_id_here
```

### 4. Aplikační konfigurace
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-app-name.up.railway.app
WEBHOOK_BASE_URL=https://your-app-name.up.railway.app
```

### 5. Bezpečnost
```
JWT_SECRET=your_very_secure_jwt_secret_here_minimum_32_chars
SESSION_SECRET=your_very_secure_session_secret_here
```

## Jak nastavit v Railway

1. **Otevřete Railway dashboard**
2. **Vyberte váš projekt**
3. **Klikněte na "Variables" tab**
4. **Přidejte každou proměnnou jednotlivě**

### Automatické proměnné od Railway

Railway automaticky nastaví:
- `DATABASE_URL` (po přidání PostgreSQL pluginu)
- `PORT` (automaticky přiřazený port)
- `RAILWAY_ENVIRONMENT` (production)

### Přidání PostgreSQL databáze

1. V Railway dashboard klikněte na "Add Plugin"
2. Vyberte "PostgreSQL"
3. Railway automaticky vytvoří databázi a nastaví `DATABASE_URL`

## Testování

Po nastavení všech proměnných:
1. Redeploy aplikaci
2. Zkontrolujte logs pro potvrzení připojení k databázi
3. Otestujte health endpoint: `https://your-app.railway.app/api/health`

## Troubleshooting

### Chyba: "DATABASE_URL environment variable is not set"
- Ujistěte se, že je přidán PostgreSQL plugin
- Zkontrolujte Variables tab v Railway dashboard

### Chyba: "Unable to connect to database"
- Zkontrolujte DATABASE_URL formát
- Ujistěte se, že PostgreSQL service běží

### Chyba s SSL připojením
- Railway PostgreSQL vyžaduje SSL v produkci
- Konfigurace SSL je automaticky nastavena v `database.js` 