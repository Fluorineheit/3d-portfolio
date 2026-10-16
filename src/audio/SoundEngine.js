// src/audio/SoundEngine.js
// All sound is synthesized with the Web Audio API (no audio files): oscillators and noise shaped by
// filters and volume envelopes.

const MUTED_KEY = 'soundMuted';
const VOLUME = 0.54;

function readMuted() {
  try { return localStorage.getItem(MUTED_KEY) === '1'; } catch { return false; }
}
function saveMuted(muted) {
  try {
    if (muted) localStorage.setItem(MUTED_KEY, '1');
    else localStorage.removeItem(MUTED_KEY);
  } catch { /* storage blocked: the choice just isn't remembered */ }
}

/**
 * Shared audio: the context, master volume, mute, and the UI sounds (click, camera whoosh).
 * Browsers only allow audio after a user gesture, so nothing plays until unlock() is called from one
 * (the intro's Enter). Audio is suspended while muted or while the tab is hidden.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = readMuted();
    this.listeners = new Set();
    document.addEventListener('visibilitychange', () => this.applyState());
  }

  // Call from a click / key handler
  unlock() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      const compressor = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = VOLUME;
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.noise = this.makeNoise(false);
      this.brownNoise = this.makeNoise(true);
    }
    this.applyState();
  }

  // Running only when unmuted and visible
  applyState() {
    if (!this.ctx) return;
    if (this.muted || document.hidden) this.ctx.suspend();
    else this.ctx.resume();
  }

  get ready() {
    return Boolean(this.ctx) && !this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    saveMuted(muted);
    this.applyState();
    this.listeners.forEach((listener) => listener(muted));
  }

  onMuteChange(listener) {
    this.listeners.add(listener);
  }

  // 2 s of white noise, or brown noise (white noise integrated: deeper, rumbly)
  makeNoise(brown) {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  // Quick attack, exponential fade
  envelope(gain, time, attack, peak, decay) {
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  // Soft tick: a short sine that drops in pitch
  click() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.05);
    this.envelope(gain, t, 0.002, 0.5, 0.06);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Camera move: filtered noise sweeping up (dir 1, focusing in) or down (dir -1, going back)
  whoosh(dir) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(dir > 0 ? 250 : 2400, t);
    filter.frequency.exponentialRampToValueAtTime(dir > 0 ? 2400 : 250, t + 0.9);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.45, t + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.4 * dir, t);
    pan.pan.linearRampToValueAtTime(0.4 * dir, t + 1.0);
    source.connect(filter).connect(gain).connect(pan).connect(this.master);
    source.start(t, Math.random());
    source.stop(t + 1.05);
  }
}

export const sound = new SoundEngine();
