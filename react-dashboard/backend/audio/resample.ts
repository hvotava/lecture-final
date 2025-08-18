/**
 * Audio resampling: 8kHz ↔ 24kHz (3× up/down)
 * Jednoduchý FIR low-pass filter pro anti-aliasing
 */

/**
 * Jednoduchý 5-tap low-pass FIR filter
 * Koeficienty pro cutoff ~3.5kHz při 8kHz sample rate
 */
const LOW_PASS_COEFFS = [0.1, 0.2, 0.4, 0.2, 0.1];

/**
 * Aplikuje FIR filter na PCM16 data
 * @param input PCM16 data
 * @param coeffs Filter koeficienty
 * @returns Filtrovaná data
 */
function applyFIRFilter(input: Int16Array, coeffs: number[]): Int16Array {
  const output = new Int16Array(input.length);
  const filterLength = coeffs.length;
  const halfLength = Math.floor(filterLength / 2);
  
  for (let i = 0; i < input.length; i++) {
    let sum = 0;
    for (let j = 0; j < filterLength; j++) {
      const sampleIndex = i - halfLength + j;
      const sample = (sampleIndex >= 0 && sampleIndex < input.length) 
        ? input[sampleIndex] 
        : 0;
      sum += sample * coeffs[j];
    }
    // Clamp to int16 range
    output[i] = Math.max(-32768, Math.min(32767, Math.round(sum)));
  }
  
  return output;
}

/**
 * Upsample 8kHz → 24kHz (3× interpolace)
 * Metoda: Zero-stuffing + low-pass filter
 * @param input PCM16 @ 8kHz
 * @returns PCM16 @ 24kHz
 */
export function upsample8kTo24k(input: Int16Array): Int16Array {
  if (input.length === 0) return new Int16Array(0);
  
  // Step 1: Zero-stuffing (vložit 2 nuly mezi každý sample)
  const stuffed = new Int16Array(input.length * 3);
  for (let i = 0; i < input.length; i++) {
    stuffed[i * 3] = input[i] * 3; // Kompenzace zisku
    stuffed[i * 3 + 1] = 0;
    stuffed[i * 3 + 2] = 0;
  }
  
  // Step 2: Anti-aliasing low-pass filter
  return applyFIRFilter(stuffed, LOW_PASS_COEFFS);
}

/**
 * Downsample 24kHz → 8kHz (3× decimace)
 * Metoda: Low-pass filter + každý 3. sample
 * @param input PCM16 @ 24kHz
 * @returns PCM16 @ 8kHz
 */
export function downsample24kTo8k(input: Int16Array): Int16Array {
  if (input.length === 0) return new Int16Array(0);
  
  // Step 1: Anti-aliasing low-pass filter
  const filtered = applyFIRFilter(input, LOW_PASS_COEFFS);
  
  // Step 2: Decimace (každý 3. sample)
  const outputLength = Math.floor(filtered.length / 3);
  const output = new Int16Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    output[i] = filtered[i * 3];
  }
  
  return output;
}

/**
 * Utility: Jednoduchý linear interpolation pro zlomkové resampling
 * @param input PCM16 data
 * @param ratio Poměr výstupní/vstupní sample rate
 * @returns Resamplovaná data
 */
export function linearResample(input: Int16Array, ratio: number): Int16Array {
  if (input.length === 0 || ratio <= 0) return new Int16Array(0);
  
  const outputLength = Math.floor(input.length * ratio);
  const output = new Int16Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i / ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const fraction = sourceIndex - leftIndex;
    
    const leftSample = input[leftIndex] || 0;
    const rightSample = input[rightIndex] || 0;
    
    output[i] = Math.round(leftSample + (rightSample - leftSample) * fraction);
  }
  
  return output;
}

/**
 * Utility: Detekce a potlačení DC offset
 * @param input PCM16 data
 * @returns Data bez DC offsetu
 */
export function removeDCOffset(input: Int16Array): Int16Array {
  if (input.length === 0) return input;
  
  // Vypočítej průměr (DC offset)
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i];
  }
  const dcOffset = Math.round(sum / input.length);
  
  // Odstraň DC offset
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = Math.max(-32768, Math.min(32767, input[i] - dcOffset));
  }
  
  return output;
}

/**
 * Kombinovaná funkce: 8kHz μ-law → 24kHz PCM16
 * @param mulawData μ-law buffer @ 8kHz
 * @returns PCM16 @ 24kHz
 */
export function convertTwilioToOpenAI(mulawData: Buffer): Int16Array {
  // Import zde pro avoid circular dependency
  const { muLawToPCM16 } = require('./mulaw');
  
  // μ-law → PCM16 @ 8kHz
  const pcm8k = muLawToPCM16(mulawData);
  
  // Remove DC offset
  const cleanPcm8k = removeDCOffset(pcm8k);
  
  // 8kHz → 24kHz
  return upsample8kTo24k(cleanPcm8k);
}

/**
 * Kombinovaná funkce: 24kHz PCM16 → 8kHz μ-law
 * @param pcm24k PCM16 @ 24kHz
 * @returns μ-law buffer @ 8kHz
 */
export function convertOpenAIToTwilio(pcm24k: Int16Array): Buffer {
  // Import zde pro avoid circular dependency
  const { pcm16ToMuLaw } = require('./mulaw');
  
  // 24kHz → 8kHz
  const pcm8k = downsample24kTo8k(pcm24k);
  
  // Remove DC offset
  const cleanPcm8k = removeDCOffset(pcm8k);
  
  // PCM16 → μ-law
  return pcm16ToMuLaw(cleanPcm8k);
} 