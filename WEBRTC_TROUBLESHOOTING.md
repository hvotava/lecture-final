# 🔧 WebRTC Troubleshooting Guide

## 🚨 Problem: AI Assistant Not Responding

**Symptom:** WebRTC phone calls connect, but AI assistant doesn't respond or speak.

## 🔍 Diagnosis Steps

### 1. Check Configuration
Visit debug endpoint: `https://your-app.railway.app/api/webrtc/debug`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "environment": {
      "OPENAI_API_KEY": "SET (length: 51)",
      "TWILIO_ACCOUNT_SID": "SET",
      "TWILIO_AUTH_TOKEN": "SET"
    },
    "status": {
      "openai_ready": true,
      "twilio_ready": true,
      "overall_status": "READY"
    }
  }
}
```

### 2. Common Issues & Solutions

#### ❌ Issue: `OPENAI_API_KEY: "NOT SET"`
**Solution:** Add OpenAI API key to Railway environment variables
```bash
# In Railway Dashboard → Settings → Environment
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### ❌ Issue: `TWILIO_ACCOUNT_SID: "NOT SET"`
**Solution:** Add Twilio credentials to Railway environment variables
```bash
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### ❌ Issue: WebSocket Connection Fails
**Solution:** Check WebSocket URL in Twilio webhook configuration
- Webhook URL: `https://your-app.railway.app/api/webrtc/voice`
- WebSocket URL: `wss://your-app.railway.app/api/webrtc/stream`

### 3. Test WebRTC Flow

#### Step 1: Call Test
1. Call your Twilio phone number
2. Should hear: "Vítejte v interaktivním školení. Připojuji vás k AI asistentovi."
3. Should connect to WebSocket stream

#### Step 2: Check Logs
Look for these log entries:
```
🎯 NEW Twilio WebSocket connected - OFFICIAL INTEGRATION
✅ Connected to OpenAI Realtime API
📤 Sending session update to OpenAI
```

#### Step 3: Test AI Response
- Speak into phone after connection
- AI should respond within 2-3 seconds
- Check for audio streaming logs

## 🛠️ Quick Fixes

### Fix 1: Environment Variables
```bash
# Required variables in Railway Dashboard
OPENAI_API_KEY=sk-your-key-here
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### Fix 2: Twilio Webhook Configuration
```
Voice Webhook URL: https://your-app.railway.app/api/webrtc/voice
HTTP Method: POST
```

### Fix 3: Restart Service
After adding environment variables:
1. Redeploy Railway service
2. Wait 30 seconds for startup
3. Test phone call again

## 📊 Monitoring

### Health Check Endpoint
`GET /api/webrtc/debug` - Returns configuration status

### Log Monitoring
Watch for these critical logs:
- `🎯 NEW Twilio WebSocket connected`
- `✅ Connected to OpenAI Realtime API`
- `📤 Sending session update to OpenAI`
- `🎵 Audio response from OpenAI`

### Error Patterns
Common error logs to watch for:
- `❌ Missing OpenAI API key` - Add OPENAI_API_KEY
- `❌ WebSocket connection failed` - Check network/firewall
- `❌ OpenAI API error` - Check API key validity

## 🔧 Current Status

### ✅ Working Components
- Twilio webhook integration
- WebSocket connection handling
- Audio format conversion (G.711 μ-law)
- Express-WS routing

### 🚨 Common Issues
1. **Missing OPENAI_API_KEY** (most common)
2. **Incorrect webhook URLs** in Twilio console
3. **Network/firewall** blocking WebSocket connections
4. **Invalid API credentials** (expired/wrong keys)

## 📞 Test Procedure

1. **Environment Check:** Visit `/api/webrtc/debug`
2. **Phone Test:** Call Twilio number
3. **Log Check:** Monitor server logs
4. **AI Test:** Speak and wait for response

If all steps pass but AI still doesn't respond, check OpenAI API quota and rate limits. 