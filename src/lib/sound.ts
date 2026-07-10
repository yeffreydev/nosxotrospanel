import { useSettings } from '../store/settings';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

type Tone = 'success' | 'info' | 'error';

const PROFILES: Record<Tone, { freqs: number[]; gain: number }> = {
  success: { freqs: [660, 880], gain: 0.08 },
  info: { freqs: [520], gain: 0.05 },
  error: { freqs: [320, 240], gain: 0.07 },
};

/** Soft "ding" using WebAudio. Respects the global mute setting. */
export function playDing(tone: Tone = 'success') {
  if (!useSettings.getState().sound) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const profile = PROFILES[tone];
  const now = audio.currentTime;
  profile.freqs.forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    const dur = 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(profile.gain, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + dur);
  });
}
