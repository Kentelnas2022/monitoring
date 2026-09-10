/**
 * Web Audio API Alert Beep Utility for Network Monitoring System
 * Generates urgent synthesized alarm tones without external audio file dependencies.
 * Conforms to NOC dispatch standards: alternating urgent dual-tone sequence.
 */

let globalAudioCtx: AudioContext | null = null;
let activeBeepStopFn: (() => void) | null = null;

/**
 * Initialize or resume AudioContext after user interaction
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }

    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }

    return globalAudioCtx;
  } catch (err) {
    console.warn('[Audio Alert] Web Audio API initialization notice:', err);
    return null;
  }
}

// Global user gesture listener to unlock browser autoplay policy
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { once: false, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: false, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dict_monitoring_audio_muted') === 'true';
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dict_monitoring_audio_muted', muted ? 'true' : 'false');
}

/**
 * Play urgent downtime beep sequence for a specified duration (default: 3 seconds).
 * Automatically stops after at least 3 seconds.
 * Returns a cancel/stop function.
 */
export function playDowntimeBeep(durationMs: number = 3000): () => void {
  // Stop any currently running beep sequence
  if (activeBeepStopFn) {
    try {
      activeBeepStopFn();
    } catch {}
    activeBeepStopFn = null;
  }

  if (isAudioMuted()) {
    return () => {};
  }

  const ctx = getAudioContext();
  if (!ctx) return () => {};

  try {
    const now = ctx.currentTime;
    const durationSeconds = Math.max(3, durationMs / 1000);

    // Master Gain for safe, crisp volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.connect(ctx.destination);

    // Envelope Gain Node for clean pulsed beeps
    const envelopeGain = ctx.createGain();
    envelopeGain.gain.setValueAtTime(0, now);
    envelopeGain.connect(masterGain);

    // Dual-frequency Oscillator for urgent emergency warble (880Hz A5 & 988Hz B5)
    const osc = ctx.createOscillator();
    osc.type = 'sine';

    const beepOnTime = 0.18;  // 180ms sound
    const pauseTime = 0.10;   // 100ms pause
    const cycleTime = beepOnTime + pauseTime; // 280ms total cycle
    const cycleCount = Math.ceil(durationSeconds / cycleTime);

    for (let i = 0; i < cycleCount; i++) {
      const cycleStart = now + (i * cycleTime);
      if (cycleStart >= now + durationSeconds) break;

      const toneFreq = i % 2 === 0 ? 880 : 988; // Alternating urgent emergency siren frequencies
      osc.frequency.setValueAtTime(toneFreq, cycleStart);

      // Quick attack & release to avoid audio popping
      envelopeGain.gain.setValueAtTime(0, cycleStart);
      envelopeGain.gain.linearRampToValueAtTime(0.35, cycleStart + 0.02);
      envelopeGain.gain.setValueAtTime(0.35, cycleStart + beepOnTime - 0.02);
      envelopeGain.gain.linearRampToValueAtTime(0, cycleStart + beepOnTime);
    }

    osc.connect(envelopeGain);
    osc.start(now);

    const stopTime = now + durationSeconds;
    osc.stop(stopTime);

    let isStopped = false;
    const stopFn = () => {
      if (isStopped) return;
      isStopped = true;
      try {
        osc.stop();
        osc.disconnect();
        envelopeGain.disconnect();
        masterGain.disconnect();
      } catch {}
    };

    activeBeepStopFn = stopFn;

    // Clean up active stop pointer when duration finishes
    setTimeout(() => {
      if (activeBeepStopFn === stopFn) {
        activeBeepStopFn = null;
      }
    }, durationMs + 100);

    return stopFn;
  } catch (e) {
    console.warn('[Audio Alert] Error playing downtime beep:', e);
    return () => {};
  }
}
