# Railway Node.js Deployment Fix

## Problém
Railway se pokouší spustit aplikaci pomocí `gunicorn` (Python WSGI server) místo Node.js.

## Řešení
Aplikoval jsem následující opravy:

### 1. Explicitní Railway konfigurace
- `railway.json` - přidán `startCommand: "npm start"`
- `nixpacks.toml` - specifikace Node.js 18 a npm
- `.railwayignore` - ignorování Python backup souborů
- `.buildpacks` - explicitní Node.js buildpack
- `Procfile` - web proces pro Node.js

### 2. Aktualizované soubory
- ✅ `railway.json` - přidán startCommand
- ✅ `nixpacks.toml` - Node.js konfigurace
- ✅ `.railwayignore` - ignorování python-backup/
- ✅ `.buildpacks` - Node.js buildpack
- ✅ `Procfile` - npm start příkaz
- ✅ `package.json` - aktualizované skripty

### 3. Struktura projektu
```
/
├── package.json (hlavní, s npm scripts)
├── railway.json (Railway konfigurace)
├── nixpacks.toml (build konfigurace)
├── Procfile (start příkaz)
└── react-dashboard/
    ├── frontend/ (React app)
    └── backend/ (Express server)
```

### 4. Deployment příkazy
```bash
npm install    # Nainstaluje závislosti pro frontend i backend
npm run build  # Sestaví React frontend
npm start      # Spustí Express backend server
```

### 5. Health Check
Aplikace má health check endpoint na `/api/health`

## Výsledek
Railway by nyní měl rozpoznat projekt jako Node.js aplikaci a spustit ji správně pomocí `npm start` místo `gunicorn`. 