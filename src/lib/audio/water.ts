/**
 * Running-water sound for the Studio tap, synthesised with Web Audio (no audio file):
 * filtered noise with a slow random flutter, faded in and out.
 */
let ctx: AudioContext | null = null;
let node: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
let users = 0;

function muted() {
  try {
    return localStorage.getItem("unipanel-studio-sound") === "off";
  } catch {
    return false;
  }
}

export function startWater() {
  users++;
  if (node || muted() || typeof window === "undefined") return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // pinkish noise: smoother than white, closer to running water
      last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
      d[i] = last * 6 + (Math.random() * 2 - 1) * 0.15;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.7;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(bp.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.35);
    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start();
    lfo.start();
    node = { src, gain, lfo };
  } catch {
    node = null;
  }
}

export function stopWater() {
  users = Math.max(0, users - 1);
  if (users > 0 || !node || !ctx) return;
  const n = node;
  node = null;
  n.gain.gain.cancelScheduledValues(ctx.currentTime);
  n.gain.gain.setValueAtTime(n.gain.gain.value, ctx.currentTime);
  n.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  setTimeout(() => {
    try {
      n.src.stop();
      n.lfo.stop();
    } catch {
      /* already stopped */
    }
  }, 350);
}
