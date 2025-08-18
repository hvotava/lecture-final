/**
 * μ-law audio codec implementation
 * Twilio používá μ-law @ 8kHz, OpenAI Realtime používá PCM16 @ 24kHz
 */

// μ-law konstanty
const MULAW_MAX = 0x1FFF;
const MULAW_BIAS = 0x84;

// Předpočítané tabulky pro rychlou konverzi
let mulaw_to_linear;
let linear_to_mulaw;

// Inicializace tabulek
function initializeTables() {
  if (mulaw_to_linear) return;

  // μ-law → Linear (PCM16) tabulka
  mulaw_to_linear = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let mulaw = ~i;
    let t = ((mulaw & 0x0F) << 3) + MULAW_BIAS;
    t <<= (mulaw & 0x70) >> 4;
    mulaw_to_linear[i] = (mulaw & 0x80) ? (MULAW_BIAS - t) : (t - MULAW_BIAS);
  }

  // Linear (PCM16) → μ-law tabulka
  linear_to_mulaw = new Uint8Array(65536);
  for (let i = 0; i < 65536; i++) {
    let pcm = (i < 32768) ? i : i - 65536; // Convert unsigned to signed
    let sign = (pcm < 0) ? 0x80 : 0;
    if (sign) pcm = -pcm;
    
    if (pcm > MULAW_MAX) pcm = MULAW_MAX;
    pcm += MULAW_BIAS;
    
    let exponent = 7;
    for (let exp_lut = 0x4000; (pcm & exp_lut) === 0 && exponent > 0; exponent--, exp_lut >>= 1);
    
    let mantissa = (pcm >> (exponent + 3)) & 0x0F;
    let mulaw = ~(sign | (exponent << 4) | mantissa);
    
    linear_to_mulaw[i] = mulaw & 0xFF;
  }
}

/**
 * Převede μ-law buffer na PCM16 Int16Array
 * @param {Buffer|Uint8Array} buffer μ-law data
 * @returns {Int16Array} PCM16 jako Int16Array
 */
function muLawToPCM16(buffer) {
  initializeTables();
  
  const result = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = mulaw_to_linear[buffer[i]];
  }
  return result;
}

/**
 * Převede PCM16 Int16Array na μ-law Buffer
 * @param {Int16Array} int16 PCM16 data jako Int16Array
 * @returns {Buffer} μ-law jako Buffer
 */
function pcm16ToMuLaw(int16) {
  initializeTables();
  
  const result = Buffer.alloc(int16.length);
  for (let i = 0; i < int16.length; i++) {
    // Convert signed int16 to unsigned index (0-65535)
    const unsignedIndex = (int16[i] + 32768) & 0xFFFF;
    result[i] = linear_to_mulaw[unsignedIndex];
  }
  return result;
}

/**
 * Utility: Převede base64 μ-law na PCM16
 * @param {string} base64 Base64 μ-law string z Twilio
 * @returns {Int16Array} PCM16 jako Int16Array
 */
function base64MuLawToPCM16(base64) {
  const buffer = Buffer.from(base64, 'base64');
  return muLawToPCM16(buffer);
}

/**
 * Utility: Převede PCM16 na base64 μ-law pro Twilio
 * @param {Int16Array} int16 PCM16 data
 * @returns {string} Base64 μ-law string
 */
function pcm16ToBase64MuLaw(int16) {
  const buffer = pcm16ToMuLaw(int16);
  return buffer.toString('base64');
}

module.exports = {
  muLawToPCM16,
  pcm16ToMuLaw,
  base64MuLawToPCM16,
  pcm16ToBase64MuLaw,
  // Export pro testování
  mulaw_to_linear,
  linear_to_mulaw
}; 