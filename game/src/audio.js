// Tiny original WebAudio bleeps. No audio files, no network.
// The context is created lazily on the first user gesture.

let ctx = null;

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function blip(freq, seconds, type, gainValue) {
  const audio = ensureContext();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + seconds);
}

export function soundFound() {
  blip(880, 0.12, 'sine', 0.16);
  window.setTimeout(() => blip(1320, 0.16, 'sine', 0.14), 70);
}

export function soundWrong() {
  blip(180, 0.18, 'square', 0.08);
}

export function soundWin() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    window.setTimeout(() => blip(freq, 0.2, 'triangle', 0.14), i * 110);
  });
}

export function soundHint() {
  blip(660, 0.1, 'sine', 0.1);
}
