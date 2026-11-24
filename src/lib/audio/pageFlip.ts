"use client";
/**
 * A synthesised page-turn sound (Web Audio): a short burst of filtered noise that
 * sweeps down like paper moving through air, with a soft landing. Hard covers get a
 * deeper, slower "thud". No audio files to download or license.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (!noise) {
    const len = Math.floor(ctx.sampleRate * 0.6);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // slightly brown-ish noise reads more like paper than pure white noise
      last = last * 0.6 + (Math.random() * 2 - 1) * 0.4;
      d[i] = last;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playPageFlip(kind: "page" | "cover" = "page", volume = 0.55) {
  const ac = audio();
  if (!ac || !noise) return;
  const t = ac.currentTime;
  const cover = kind === "cover";
  const dur = cover ? 0.42 : 0.34;

  // swish
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = cover ? 0.7 : 0.9 + Math.random() * 0.2;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = cover ? 0.7 : 1.1;
  band.frequency.setValueAtTime(cover ? 1400 : 3200, t);
  band.frequency.exponentialRampToValueAtTime(cover ? 260 : 700, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume * (cover ? 0.7 : 1), t + 0.035);
  g.gain.exponentialRampToValueAtTime(volume * 0.35, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band).connect(g).connect(ac.destination);
  src.start(t, Math.random() * 0.1, dur + 0.05);

  // landing: a soft low tap as the page (or board) settles
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(cover ? 120 : 220, t + dur * 0.85);
  thud.frequency.exponentialRampToValueAtTime(cover ? 55 : 110, t + dur + 0.12);
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.0001, t + dur * 0.85);
  tg.gain.exponentialRampToValueAtTime(volume * (cover ? 0.5 : 0.12), t + dur * 0.9);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);
  thud.connect(tg).connect(ac.destination);
  thud.start(t + dur * 0.85);
  thud.stop(t + dur + 0.2);
}
