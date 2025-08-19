const WebSocket = require('ws');
const { parse } = require('url');

// Audio processing imports (converted to JavaScript paths)
const { base64MuLawToPCM16, pcm16ToBase64MuLaw } = require('../audio/mulaw');
const { convertTwilioToOpenAI, convertOpenAIToTwilio } = require('../audio/resample');

// OpenAI helpers (converted to JavaScript paths)
const {
  sendAppendPCM,
  sendCommit,
  sendCreateResponse,
  sendCancelResponse,
  parseOpenAIEvent,
  logOpenAIEvent,
  sendConversationItem
} = require('../lib/openaiRealtime');

/**
 * Nastavení WebSocket serveru pro Twilio Media Streams
 * @param {Object} server HTTP server instance
 */
function setupTwilioWebSocket(server) {
  const wss = new WebSocket.Server({ noServer: true });

  // Handle WebSocket upgrade pro /api/webrtc/stream
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');
    console.log('🔄 WebSocket upgrade request for:', pathname);
    console.log('🔄 Full URL:', request.url);
    
    if (pathname === '/api/webrtc/stream' || 
        pathname?.startsWith('/api/webrtc/stream') ||
        pathname === '/webrtc/stream/.websocket' ||
        pathname?.startsWith('/webrtc/stream')) {
      console.log('✅ WebSocket upgrade accepted for Twilio stream:', pathname);
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log(`❌ Unknown WebSocket path: ${pathname}`);
      socket.destroy();
    }
  });

  // Handle WebSocket connections
  wss.on('connection', (twilioWs, request) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    console.log(`🔗 [${sessionId}] Twilio WebSocket connected`);

    let openaiWs = null;
    let streamSid = null;
    let audioBuffer = [];
    let isOpenAIConnected = false;
    let isReceivingResponse = false;

    // Heartbeat pro Twilio connection
    const heartbeat = setInterval(() => {
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.ping();
      }
    }, 30000);

    /**
     * Připojí se k OpenAI Realtime API
     */
    async function connectToOpenAI() {
      try {
        console.log(`🤖 [${sessionId}] Connecting to OpenAI Realtime...`);
        
        openaiWs = new WebSocket(
          'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'realtime=v1'
            }
          }
        );

        openaiWs.on('open', () => {
          console.log(`✅ [${sessionId}] OpenAI WebSocket connected`);
          isOpenAIConnected = true;

          // Pošli úvodní konverzační item
          if (openaiWs) {
            sendConversationItem(openaiWs, 
              'Zahajuji interaktivní lekci. Představ se a zeptej se na téma, které by student rád probral.',
              'user'
            );
            sendCreateResponse(openaiWs, {
              voice: 'alloy',
              instructions: 'Představ se jako AI učitel pro české firemní školení a zeptej se studenta na téma.'
            });
          }
        });

        openaiWs.on('message', (data) => {
          const event = parseOpenAIEvent(data);
          if (!event) return;

          logOpenAIEvent(event, `📥 [${sessionId}]`);

          // Handle různé typy eventů
          switch (event.type) {
            case 'input_audio_buffer.speech_started':
              // User začal mluvit - zastaví současnou odpověď (barge-in)
              if (isReceivingResponse && openaiWs) {
                sendCancelResponse(openaiWs);
                isReceivingResponse = false;
                console.log(`🛑 [${sessionId}] Barge-in detected, cancelling response`);
              }
              break;

            case 'response.audio.delta':
              // Přijmi audio chunk z OpenAI
              if (event.delta && twilioWs.readyState === WebSocket.OPEN) {
                try {
                  // Decode base64 PCM16 @ 24kHz
                  const pcm24k = Buffer.from(event.delta, 'base64');
                  const pcm24kArray = new Int16Array(pcm24k.buffer, pcm24k.byteOffset, pcm24k.length / 2);
                  
                  // Convert 24kHz PCM16 → 8kHz μ-law pro Twilio
                  const mulawBuffer = convertOpenAIToTwilio(pcm24kArray);
                  const base64MuLaw = mulawBuffer.toString('base64');

                  // Pošli do Twilio
                  const mediaEvent = {
                    event: 'media',
                    streamSid: streamSid,
                    media: {
                      payload: base64MuLaw
                    }
                  };

                  twilioWs.send(JSON.stringify(mediaEvent));
                  console.log(`🔊 [${sessionId}] Sent audio chunk to Twilio (${mulawBuffer.length} bytes)`);
                  
                } catch (error) {
                  console.error(`❌ [${sessionId}] Error processing OpenAI audio:`, error);
                }
              }
              break;

            case 'response.audio.done':
              isReceivingResponse = false;
              console.log(`🏁 [${sessionId}] OpenAI audio response completed`);
              break;

            case 'response.done':
              console.log(`✅ [${sessionId}] OpenAI response fully completed`);
              break;

            case 'error':
              console.error(`❌ [${sessionId}] OpenAI error:`, event.error);
              break;
          }
        });

        openaiWs.on('close', (code, reason) => {
          console.log(`🔌 [${sessionId}] OpenAI WebSocket closed:`, code, reason.toString());
          isOpenAIConnected = false;
        });

        openaiWs.on('error', (error) => {
          console.error(`💥 [${sessionId}] OpenAI WebSocket error:`, error);
          isOpenAIConnected = false;
        });

      } catch (error) {
        console.error(`💥 [${sessionId}] Failed to connect to OpenAI:`, error);
      }
    }

    /**
     * Zpracuje audio data z Twilio
     */
    function processAudioFromTwilio(base64Audio) {
      if (!openaiWs || !isOpenAIConnected) {
        console.warn(`⚠️ [${sessionId}] OpenAI not connected, buffering audio...`);
        audioBuffer.push(Buffer.from(base64Audio, 'base64'));
        return;
      }

      try {
        // Convert Twilio μ-law @ 8kHz → OpenAI PCM16 @ 24kHz
        const mulawBuffer = Buffer.from(base64Audio, 'base64');
        const pcm24k = convertTwilioToOpenAI(mulawBuffer);

        // Pošli do OpenAI
        sendAppendPCM(openaiWs, pcm24k);

        // Každých ~100ms commitni buffer (pro nízkou latenci)
        // Twilio posílá 20ms chunky, takže každý 5. chunk
        if (Math.random() < 0.2) { // 20% šance = ~100ms average
          sendCommit(openaiWs);
          sendCreateResponse(openaiWs);
          isReceivingResponse = true;
        }

      } catch (error) {
        console.error(`❌ [${sessionId}] Error processing Twilio audio:`, error);
      }
    }

    // Handle Twilio WebSocket messages
    twilioWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.event) {
          case 'connected':
            console.log(`🔗 [${sessionId}] Twilio stream connected`);
            break;

          case 'start':
            streamSid = message.start?.streamSid;
            console.log(`🎬 [${sessionId}] Twilio stream started:`, streamSid);
            
            // Připoj se k OpenAI až po Twilio start
            connectToOpenAI();
            break;

          case 'media':
            if (message.media?.payload) {
              processAudioFromTwilio(message.media.payload);
            }
            break;

          case 'mark':
            console.log(`📍 [${sessionId}] Twilio mark:`, message.mark?.name);
            break;

          case 'clear':
            console.log(`🧹 [${sessionId}] Twilio clear - implementing barge-in`);
            // Zastaví současnou OpenAI odpověď
            if (openaiWs && isReceivingResponse) {
              sendCancelResponse(openaiWs);
              isReceivingResponse = false;
            }
            break;

          case 'stop':
            console.log(`🛑 [${sessionId}] Twilio stream stopped`);
            break;

          default:
            console.log(`📨 [${sessionId}] Twilio event:`, message.event);
        }

      } catch (error) {
        console.error(`❌ [${sessionId}] Error parsing Twilio message:`, error);
      }
    });

    // Handle Twilio WebSocket close
    twilioWs.on('close', (code, reason) => {
      console.log(`🔌 [${sessionId}] Twilio WebSocket closed:`, code, reason.toString());
      
      // Cleanup
      clearInterval(heartbeat);
      
      if (openaiWs) {
        openaiWs.close();
        openaiWs = null;
      }
      
      audioBuffer = [];
    });

    // Handle Twilio WebSocket error
    twilioWs.on('error', (error) => {
      console.error(`💥 [${sessionId}] Twilio WebSocket error:`, error);
    });

    // Handle pong responses
    twilioWs.on('pong', () => {
      console.log(`💗 [${sessionId}] Twilio pong received`);
    });
  });

  console.log('🎧 WebSocket server ready for /api/webrtc/stream');
}

module.exports = { setupTwilioWebSocket }; 