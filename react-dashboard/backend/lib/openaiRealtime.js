const WebSocket = require('ws');

/**
 * Helper funkce pro OpenAI Realtime WebSocket komunikaci
 */

/**
 * Pošle PCM16 audio data do OpenAI Realtime API
 * @param {WebSocket} ws WebSocket connection k OpenAI
 * @param {Int16Array} pcmInt16LE PCM16 data @ 24kHz
 */
function sendAppendPCM(ws, pcmInt16LE) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping audio append');
    return;
  }

  // Convert Int16Array to base64
  const buffer = Buffer.from(pcmInt16LE.buffer);
  const base64Audio = buffer.toString('base64');

  const event = {
    type: 'input_audio_buffer.append',
    audio: base64Audio
  };

  try {
    ws.send(JSON.stringify(event));
    console.log(`📤 Sent ${pcmInt16LE.length} samples to OpenAI`);
  } catch (error) {
    console.error('❌ Error sending audio to OpenAI:', error);
  }
}

/**
 * Pošle commit event do OpenAI (spustí zpracování)
 * @param {WebSocket} ws WebSocket connection k OpenAI
 */
function sendCommit(ws) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping commit');
    return;
  }

  const event = {
    type: 'input_audio_buffer.commit'
  };

  try {
    ws.send(JSON.stringify(event));
    console.log('📤 Committed audio buffer to OpenAI');
  } catch (error) {
    console.error('❌ Error committing audio buffer:', error);
  }
}

/**
 * Pošle response.create event (spustí generování odpovědi)
 * @param {WebSocket} ws WebSocket connection k OpenAI
 * @param {Object} options Volitelné parametry
 */
function sendCreateResponse(ws, options = {}) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping response creation');
    return;
  }

  const event = {
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
      instructions: options.instructions,
      voice: options.voice || 'alloy',
      output_audio_format: 'pcm16',
      temperature: options.temperature || 0.8,
      max_output_tokens: options.max_output_tokens || 4096,
    }
  };

  // Remove undefined values
  Object.keys(event.response).forEach(key => {
    if (event.response[key] === undefined) {
      delete event.response[key];
    }
  });

  try {
    ws.send(JSON.stringify(event));
    console.log('📤 Requested response from OpenAI');
  } catch (error) {
    console.error('❌ Error requesting response:', error);
  }
}

/**
 * Pošle conversation.item.create event (přidá zprávu do konverzace)
 * @param {WebSocket} ws WebSocket connection k OpenAI
 * @param {string} content Text obsah zprávy
 * @param {string} role Role ('user' nebo 'assistant')
 */
function sendConversationItem(ws, content, role = 'user') {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping conversation item');
    return;
  }

  const event = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: role,
      content: [
        {
          type: 'input_text',
          text: content
        }
      ]
    }
  };

  try {
    ws.send(JSON.stringify(event));
    console.log(`📤 Added conversation item: ${role} - ${content.substring(0, 50)}...`);
  } catch (error) {
    console.error('❌ Error adding conversation item:', error);
  }
}

/**
 * Pošle response.cancel event (zastaví současnou odpověď - pro barge-in)
 * @param {WebSocket} ws WebSocket connection k OpenAI
 */
function sendCancelResponse(ws) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping cancel');
    return;
  }

  const event = {
    type: 'response.cancel'
  };

  try {
    ws.send(JSON.stringify(event));
    console.log('📤 Cancelled current OpenAI response (barge-in)');
  } catch (error) {
    console.error('❌ Error cancelling response:', error);
  }
}

/**
 * Pošle session.update event (aktualizuje session nastavení)
 * @param {WebSocket} ws WebSocket connection k OpenAI
 * @param {Object} updates Aktualizace session
 */
function sendSessionUpdate(ws, updates) {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ OpenAI WS not ready, skipping session update');
    return;
  }

  const event = {
    type: 'session.update',
    session: updates
  };

  try {
    ws.send(JSON.stringify(event));
    console.log('📤 Updated OpenAI session settings');
  } catch (error) {
    console.error('❌ Error updating session:', error);
  }
}

/**
 * Utility: Parsuje incoming OpenAI event
 * @param {*} data Raw WebSocket data
 * @returns {Object|null} Parsed event nebo null
 */
function parseOpenAIEvent(data) {
  try {
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error parsing OpenAI event:', error);
    return null;
  }
}

/**
 * Utility: Loguje OpenAI event pro debugging
 * @param {Object} event Parsed event
 * @param {string} prefix Log prefix
 */
function logOpenAIEvent(event, prefix = '📥') {
  if (!event || !event.type) return;

  switch (event.type) {
    case 'session.created':
      console.log(`${prefix} Session created: ${event.session?.id}`);
      break;
    case 'input_audio_buffer.speech_started':
      console.log(`${prefix} User started speaking`);
      break;
    case 'input_audio_buffer.speech_stopped':
      console.log(`${prefix} User stopped speaking`);
      break;
    case 'response.audio.delta':
      console.log(`${prefix} Audio chunk received (${event.delta?.length || 0} chars)`);
      break;
    case 'response.audio.done':
      console.log(`${prefix} Audio response completed`);
      break;
    case 'response.done':
      console.log(`${prefix} Response completed`);
      break;
    case 'error':
      console.error(`${prefix} OpenAI error:`, event.error);
      break;
    default:
      console.log(`${prefix} ${event.type}:`, event);
  }
}

module.exports = {
  sendAppendPCM,
  sendCommit,
  sendCreateResponse,
  sendConversationItem,
  sendCancelResponse,
  sendSessionUpdate,
  parseOpenAIEvent,
  logOpenAIEvent
}; 