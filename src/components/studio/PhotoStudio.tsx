"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/lib/store/studio";
import { finishById, finishLabel } from "@/data/catalogue";
import type { Finish } from "@/data/types";
import { ZONE_LABEL, encodeScheme, type Zone } from "@/lib/studio/scheme";
import { asset } from "@/lib/asset";
import { FinishDrawer } from "./FinishDrawer";

/**
 * "Your kitchen": try the boards on a photo of the visitor's own room, live, in the browser.
 * The visitor traces each surface by its four corners; every finish is then laid onto
 * that quad in true perspective (a homography, drawn as a fine triangle mesh) at real
 * scale, and the photo's own light and shadow are multiplied back over it so door gaps,
 * shading and reflections stay. Nothing is uploaded: the photo never leaves the device.
 */

type P = [number, number];
interface Surface {
  id: string;
  zone: Zone;
  pts: P[]; // 4 corners in image pixels, ordered TL, TR, BR, BL
  widthMM: number;
  rotate: boolean;
}

const ZONES: Zone[] = ["baseDoors", "wallDoors", "tallUnits", "islandFronts", "splashback", "cladding", "gables", "kickplate"];
const WIDTHS = [600, 1200, 2400, 3600];
const MAX_EDGE = 2000;

// ---------------------------------------------------------------- geometry

/** Order four points as top-left, top-right, bottom-right, bottom-left. */
function orderQuad(pts: P[]): P[] {
  const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
  const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
  const s = [...pts].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  let tl = 0;
  s.forEach((p, i) => {
    if (p[0] + p[1] < s[tl][0] + s[tl][1]) tl = i;
  });
  return [...s.slice(tl), ...s.slice(0, tl)];
}

/** Unit square → quad homography (Heckbert). Returns a mapper (u, v) → image point. */
function squareToQuad(q: P[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u: number, v: number): P => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
  };
}

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function pathQuad(ctx: CanvasRenderingContext2D, q: P[]) {
  ctx.beginPath();
  ctx.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
  ctx.closePath();
}

/** Draw `src` (covering the unit square) onto the quad as a perspective-correct triangle mesh. */
function warpInto(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, q: P[], n = 14) {
  const map = squareToQuad(q);
  const sw = src.width, sh = src.height;
  const grid: P[][] = [];
  for (let j = 0; j <= n; j++) {
    grid.push([]);
    for (let i = 0; i <= n; i++) grid[j].push(map(i / n, j / n));
  }
  const tri = (s: P[], d: P[]) => {
    // expand the destination triangle a hair around its centroid to hide seams
    const cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3;
    const dd = d.map(([x, y]) => {
      const l = Math.hypot(x - cx, y - cy) || 1;
      return [x + ((x - cx) / l) * 0.7, y + ((y - cy) / l) * 0.7] as P;
    });
    const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = s;
    const [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = d;
    const den = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
    if (Math.abs(den) < 1e-9) return;
    const m11 = -(sy0 * (dx2 - dx1) - sy1 * dx2 + sy2 * dx1 + (sy1 - sy2) * dx0) / den;
    const m12 = (sy1 * dy2 + sy0 * (dy1 - dy2) - sy2 * dy1 + (sy2 - sy1) * dy0) / den;
    const m21 = (sx0 * (dx2 - dx1) - sx1 * dx2 + sx2 * dx1 + (sx1 - sx2) * dx0) / den;
    const m22 = -(sx1 * dy2 + sx0 * (dy1 - dy2) - sx2 * dy1 + (sx2 - sx1) * dy0) / den;
    const dx = (sx0 * (sy2 * dx1 - sy1 * dx2) + sy0 * (sx1 * dx2 - sx2 * dx1) + (sx2 * sy1 - sx1 * sy2) * dx0) / den;
    const dy = (sx0 * (sy2 * dy1 - sy1 * dy2) + sy0 * (sx1 * dy2 - sx2 * dy1) + (sx2 * sy1 - sx1 * sy2) * dy0) / den;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dd[0][0], dd[0][1]);
    ctx.lineTo(dd[1][0], dd[1][1]);
    ctx.lineTo(dd[2][0], dd[2][1]);
    ctx.closePath();
    ctx.clip();
    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  };
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const u0 = (i / n) * sw, u1 = ((i + 1) / n) * sw, v0 = (j / n) * sh, v1 = ((j + 1) / n) * sh;
      tri([[u0, v0], [u1, v0], [u1, v1]], [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1]]);
      tri([[u0, v0], [u1, v1], [u0, v1]], [grid[j][i], grid[j + 1][i + 1], grid[j + 1][i]]);
    }
}

// ---------------------------------------------------------------- textures

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(src: string) {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    imgCache.set(src, p);
  }
  return p;
}

/** The finish tiled at real scale for a surface of widthMM × heightMM. */
async function tiledFinish(f: Finish, widthMM: number, heightMM: number, rotate: boolean) {
  const c = document.createElement("canvas");
  const aspect = heightMM / Math.max(1, widthMM);
  c.width = 1400;
  c.height = Math.max(64, Math.min(2800, Math.round(1400 * aspect)));
  const g = c.getContext("2d")!;
  if (f.flat) {
    g.fillStyle = f.hex;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  const img = await loadImg(f.textures.tex);
  const [tw, th] = rotate ? [f.texMM[1], f.texMM[0]] : f.texMM;
  const pxPerMM = c.width / widthMM;
  const tileW = tw * pxPerMM, tileH = th * pxPerMM;
  for (let y = 0; y < c.height; y += tileH)
    for (let x = 0; x < c.width; x += tileW) {
      if (rotate) {
        g.save();
        g.translate(x + tileW / 2, y + tileH / 2);
        g.rotate(Math.PI / 2);
        g.drawImage(img, -tileH / 2, -tileW / 2, tileH, tileW);
        g.restore();
      } else g.drawImage(img, x, y, tileW, tileH);
    }
  return c;
}

/** Shading and highlight layers from the photo for one surface, normalised to that surface's mean brightness. */
function shadingLayers(photo: HTMLCanvasElement, lum: Float32Array, q: P[]) {
  const W = photo.width, H = photo.height;
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H, Math.ceil(Math.max(...ys)));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  // mean brightness inside the quad (sampled)
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const mg = mask.getContext("2d")!;
  mg.translate(-x0, -y0);
  pathQuad(mg, q);
  mg.fill();
  const md = mg.getImageData(0, 0, w, h).data;
  let sum = 0, n = 0;
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2) {
      if (md[(y * w + x) * 4 + 3] > 128) {
        sum += lum[(y + y0) * W + (x + x0)];
        n++;
      }
    }
  const mean = Math.max(0.05, n ? sum / n : 0.5);
  const shade = document.createElement("canvas");
  shade.width = w;
  shade.height = h;
  const hi = document.createElement("canvas");
  hi.width = w;
  hi.height = h;
  const sd = shade.getContext("2d")!.createImageData(w, h);
  const hd = hi.getContext("2d")!.createImageData(w, h);
  // Separate the old surface's own pattern from the room's light: a soft-blurred copy carries
  // the broad shading; fine detail is kept only where it is clearly dark (door gaps, edges,
  // contact shadows), so the new finish is not printed over with the old one's veins or grain.
  const r = Math.max(2, Math.round(Math.max(w, h) / 90));
  const base = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) base[y * w + x] = lum[(y + y0) * W + (x + x0)] / mean;
  const blur = (src: Float32Array) => {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / (2 * r + 1);
        acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  };
  const soft = blur(base);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = base[i], b0 = soft[i];
      const o = i * 4;
      // broad light, gently compressed so the new finish keeps its own colour
      let s = 1 + (b0 - 1) * 0.75;
      // crisp darks: gaps, shadow lines and edges that are much darker than their surroundings
      const dark = l / Math.max(0.05, b0);
      if (dark < 0.72) s *= Math.max(0.25, dark + 0.18);
      s = Math.min(1.08, Math.max(0.08, s)) * 0.96;
      sd.data[o] = sd.data[o + 1] = sd.data[o + 2] = Math.round(Math.min(1, s) * 255);
      sd.data[o + 3] = 255;
      // screen layer: broad bright reflections and sun patches only
      const k = Math.max(0, Math.min(1, (b0 - 1.18) * 1.5));
      hd.data[o] = hd.data[o + 1] = hd.data[o + 2] = Math.round(k * 255);
      hd.data[o + 3] = 255;
    }
  shade.getContext("2d")!.putImageData(sd, 0, 0);
  hi.getContext("2d")!.putImageData(hd, 0, 0);
  return { shade, hi, x0, y0 };
}

// ---------------------------------------------------------------- component

export default function PhotoStudio() {
  const st = useStudio();
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [lum, setLum] = useState<Float32Array | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [draft, setDraft] = useState<P[]>([]);
  const [zone, setZone] = useState<Zone>("baseDoors");
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loupe, setLoupe] = useState<{ x: number; y: number; ix: number; iy: number } | null>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const comp = useRef<HTMLCanvasElement | null>(null);
  const shadeCache = useRef(new Map<string, ReturnType<typeof shadingLayers>>());
  const drag = useRef<{ sid: string; i: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  // restore brush: paint over stools, plants or people in front of a surface to bring the photo back there
  const mask = useRef<HTMLCanvasElement | null>(null);
  const [brush, setBrush] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [maskVer, setMaskVer] = useState(0);
  const painting = useRef(false);

  useEffect(() => {
    const on = () => setMobile(window.innerWidth < 1024);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // ---- load a photo (scaled so the long edge is at most MAX_EDGE) ----
  const loadPhoto = useCallback(async (src: string) => {
    setBusy(true);
    try {
      const img = await loadImg(src);
      const k = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const L = new Float32Array(c.width * c.height);
      for (let i = 0; i < L.length; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      shadeCache.current.clear();
      const m = document.createElement("canvas");
      m.width = c.width;
      m.height = c.height;
      mask.current = m;
      setMaskVer(0);
      setPhoto(c);
      setLum(L);
      setSurfaces([]);
      setDraft([]);
      setSelected(null);
      setStep(1);
    } finally {
      setBusy(false);
    }
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    imgCache.delete(url);
    loadPhoto(url);
    e.target.value = "";
  };

  // ---- composite: photo + every surface's finish in perspective + the photo's shading ----
  const zonesKey = surfaces.map((s) => `${s.zone}:${st.scheme.zones[s.zone]}`).join("|");
  useEffect(() => {
    if (!photo || !lum) return;
    let cancelled = false;
    (async () => {
      const c = comp.current ?? document.createElement("canvas");
      c.width = photo.width;
      c.height = photo.height;
      const g = c.getContext("2d")!;
      g.drawImage(photo, 0, 0);
      for (const s of surfaces) {
        const f = finishById(st.scheme.zones[s.zone]);
        if (!f) continue;
        const q = s.pts;
        const wPx = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
        const hPx = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
        const heightMM = s.widthMM * (hPx / Math.max(1, wPx));
        const tex = await tiledFinish(f, s.widthMM, heightMM, s.rotate);
        if (cancelled) return;
        g.save();
        pathQuad(g, q);
        g.clip();
        warpInto(g, tex, q);
        const key = s.id + q.flat().map((v) => v.toFixed(1)).join(",");
        let sh = shadeCache.current.get(key);
        if (!sh) {
          sh = shadingLayers(photo, lum, q);
          shadeCache.current.set(key, sh);
        }
        g.globalCompositeOperation = "multiply";
        g.drawImage(sh.shade, sh.x0, sh.y0);
        g.globalCompositeOperation = "screen";
        g.globalAlpha = 0.55;
        g.drawImage(sh.hi, sh.x0, sh.y0);
        g.restore();
      }
      if (mask.current && maskVer > 0) {
        const t = document.createElement("canvas");
        t.width = c.width;
        t.height = c.height;
        const tg = t.getContext("2d")!;
        tg.drawImage(photo, 0, 0);
        tg.globalCompositeOperation = "destination-in";
        tg.drawImage(mask.current, 0, 0);
        g.drawImage(t, 0, 0);
      }
      comp.current = c;
      setTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [photo, lum, surfaces, zonesKey, maskVer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- view: fit the composite into the frame, draw outlines and handles while tracing ----
  const fit = useMemo(() => ({ s: 1, ox: 0, oy: 0 }), []);
  const draw = useCallback(() => {
    const cv = view.current, fr = frame.current;
    if (!cv || !fr) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = fr.clientWidth, H = fr.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const src = showOriginal ? photo : comp.current ?? photo;
    if (!src) return;
    const s = Math.min(W / src.width, H / src.height);
    fit.s = s;
    fit.ox = (W - src.width * s) / 2;
    fit.oy = (H - src.height * s) / 2;
    g.imageSmoothingQuality = "high";
    g.drawImage(src, fit.ox, fit.oy, src.width * s, src.height * s);
    if (showOriginal || step === 3) return;
    if (brush && mask.current) {
      g.globalAlpha = 0.35;
      g.drawImage(mask.current, fit.ox, fit.oy, src.width * s, src.height * s);
      g.globalAlpha = 1;
    }
    const T = (p: P): P => [fit.ox + p[0] * s, fit.oy + p[1] * s];
    for (const sf of surfaces) {
      const q = sf.pts.map(T);
      const on = sf.id === selected;
      g.lineWidth = on ? 2 : 1.25;
      g.strokeStyle = on ? "#e4c020" : "rgba(255,255,255,.75)";
      g.setLineDash(on ? [] : [6, 5]);
      pathQuad(g, q);
      g.stroke();
      g.setLineDash([]);
      if (on && step === 1)
        q.forEach(([x, y]) => {
          g.beginPath();
          g.arc(x, y, 9, 0, Math.PI * 2);
          g.fillStyle = "rgba(15,15,14,.65)";
          g.fill();
          g.lineWidth = 2;
          g.strokeStyle = "#e4c020";
          g.stroke();
        });
    }
    if (draft.length) {
      const q = draft.map(T);
      g.strokeStyle = "#e4c020";
      g.lineWidth = 2;
      g.beginPath();
      q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      q.forEach(([x, y]) => {
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fillStyle = "#e4c020";
        g.fill();
      });
    }
  }, [photo, surfaces, draft, selected, showOriginal, step, fit, brush]);

  useEffect(() => {
    draw();
  });
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (frame.current) ro.observe(frame.current);
    return () => ro.disconnect();
  }, [draw]);

  // ---- pointer: place corners, drag corners, pick surfaces ----
  const toImage = (e: React.PointerEvent): P => {
    const r = view.current!.getBoundingClientRect();
    return [(e.clientX - r.left - fit.ox) / fit.s, (e.clientY - r.top - fit.oy) / fit.s];
  };
  const inside = (p: P, q: P[]) => {
    let c = false;
    for (let i = 0, j = 3; i < 4; j = i++) if (q[i][1] > p[1] !== q[j][1] > p[1] && p[0] < ((q[j][0] - q[i][0]) * (p[1] - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c;
    return c;
  };
  const showLoupe = (e: React.PointerEvent, p: P) => {
    const r = view.current!.getBoundingClientRect();
    setLoupe({ x: e.clientX - r.left, y: e.clientY - r.top, ix: p[0], iy: p[1] });
  };
  const paintAt = (p: P) => {
    const m = mask.current;
    if (!m) return;
    const g = m.getContext("2d")!;
    g.fillStyle = "#e4c020";
    g.beginPath();
    g.arc(p[0], p[1], brushSize / fit.s / 2, 0, Math.PI * 2);
    g.fill();
    draw();
  };
  const onDown = (e: React.PointerEvent) => {
    if (!photo) return;
    const p = toImage(e);
    if (brush && step === 1) {
      painting.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      paintAt(p);
      return;
    }
    if (step === 1) {
      if (!draft.length) {
        // not mid-shape: drag a corner of the selected surface, or tap a surface to select it
        const hitR = 22 / fit.s;
        const sel = surfaces.find((s) => s.id === selected);
        const hi = sel ? sel.pts.findIndex((q) => dist(q, p) < hitR) : -1;
        if (sel && hi >= 0) {
          drag.current = { sid: sel.id, i: hi };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          showLoupe(e, p);
          return;
        }
        const hit = [...surfaces].reverse().find((s) => inside(p, s.pts));
        if (hit && hit.id !== selected) {
          setSelected(hit.id);
          return;
        }
        setSelected(null);
      }
      const next = [...draft, p];
      if (next.length === 4) {
        const id = `s${Date.now().toString(36)}`;
        setSurfaces((ss) => [...ss, { id, zone, pts: orderQuad(next), widthMM: zone === "tallUnits" ? 1200 : 2400, rotate: false }]);
        setSelected(null);
        setDraft([]);
      } else setDraft(next);
      return;
    }
    if (step === 2) {
      const hit = [...surfaces].reverse().find((s) => inside(p, s.pts));
      if (hit) {
        setSelected(hit.id);
        setZone(hit.zone);
      }
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (painting.current) {
      paintAt(toImage(e));
      return;
    }
    if (!drag.current) return;
    const p = toImage(e);
    const { sid, i } = drag.current;
    setSurfaces((ss) => ss.map((s) => (s.id === sid ? { ...s, pts: s.pts.map((q, k) => (k === i ? p : q)) } : s)));
    showLoupe(e, p);
  };
  const onUp = () => {
    if (painting.current) {
      painting.current = false;
      setMaskVer((v) => v + 1);
      return;
    }
    if (drag.current) {
      const sid = drag.current.sid;
      setSurfaces((ss) => ss.map((s) => (s.id === sid ? { ...s, pts: orderQuad(s.pts) } : s)));
    }
    drag.current = null;
    setLoupe(null);
  };

  // loupe: 3× magnifier above the finger while dragging a corner
  const loupeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = loupeRef.current;
    if (!c || !loupe || !photo) return;
    const g = c.getContext("2d")!;
    const S = 120, z = 3;
    c.width = S;
    c.height = S;
    g.imageSmoothingEnabled = false;
    g.drawImage(photo, loupe.ix - S / (2 * z), loupe.iy - S / (2 * z), S / z, S / z, 0, 0, S, S);
    g.strokeStyle = "#e4c020";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(S / 2, S / 2 - 12);
    g.lineTo(S / 2, S / 2 + 12);
    g.moveTo(S / 2 - 12, S / 2);
    g.lineTo(S / 2 + 12, S / 2);
    g.stroke();
  }, [loupe, photo]);

  const sel = surfaces.find((s) => s.id === selected) ?? null;
  const usedZones = [...new Set(surfaces.map((s) => s.zone))];
  const activeZone = sel?.zone ?? usedZones[0] ?? zone;
  const activeFinish = finishById(st.scheme.zones[activeZone]);

  const save = () => {
    if (!comp.current) return;
    const a = document.createElement("a");
    a.href = comp.current.toDataURL("image/jpeg", 0.92);
    a.download = `UnipanelSA-my-kitchen-${Date.now().toString(36)}.jpg`;
    a.click();
  };

  const STEPS = ["Photo", "Trace surfaces", "Choose finishes", "Save & share"];
  const SectionLabel = ({ children }: { children: React.ReactNode }) => <p className="mb-2.5 text-[12px] uppercase tracking-[0.16em] text-stone-light">{children}</p>;

  const panelBody = [
    // 0: photo
    <div key="0" className="space-y-4">
      <p className="text-[15px] leading-relaxed text-porcelain/80">Take a straight-on photo of your kitchen in good light, or upload one. It stays on your device: nothing is uploaded.</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => camRef.current?.click()} className="rounded-2xl bg-champagne p-4 text-left text-ink">
          <span className="block text-[15px] font-medium">Take a photo</span>
          <span className="block text-[13px] opacity-75">Use your camera</span>
        </button>
        <button onClick={() => fileRef.current?.click()} className="rounded-2xl bg-white/[0.06] p-4 text-left ring-1 ring-white/10 hover:bg-white/10">
          <span className="block text-[15px] text-porcelain">Upload a photo</span>
          <span className="block text-[13px] text-stone-light">JPG, PNG or HEIC</span>
        </button>
      </div>
      <button onClick={() => loadPhoto(asset("/inspiration/ambiente-cocina-titan-01-y-titan-03-min-scaled-1.webp"))} className="w-full rounded-2xl bg-white/[0.04] p-3 text-left text-[14px] text-porcelain/85 ring-1 ring-white/10 hover:bg-white/10">
        No photo handy? <span className="text-champagne">Try a sample kitchen →</span>
      </button>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>,
    // 1: trace
    <div key="1" className="space-y-5">
      <div>
        <SectionLabel>1 · What are you tracing?</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {ZONES.map((z) => (
            <button key={z} onClick={() => setZone(z)} aria-pressed={zone === z} className={`h-9 rounded-full px-3.5 text-[13px] ${zone === z ? "bg-porcelain text-ink" : "border border-white/12 text-porcelain/85 hover:border-white/40"}`}>
              {ZONE_LABEL[z]}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.05] p-4 text-[14px] leading-relaxed text-porcelain/85">
        <p>
          <span className="text-champagne">2 · Tap the 4 corners</span> of the {ZONE_LABEL[zone].toLowerCase()} on the photo{draft.length ? ` (${draft.length}/4)` : ""}. Trace each run of doors as one shape. To adjust a shape, tap inside it and drag its yellow corners.
        </p>
        {draft.length > 0 && (
          <button onClick={() => setDraft([])} className="mt-2 text-[13px] text-stone-light underline underline-offset-4">
            Start this shape again
          </button>
        )}
      </div>
      {surfaces.length > 0 && (
        <div className="rounded-2xl bg-white/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] text-porcelain">Restore objects</p>
              <p className="text-[13px] text-stone-light">Paint over stools, plants or anything in front of a surface to bring it back.</p>
            </div>
            <button onClick={() => setBrush(!brush)} role="switch" aria-checked={brush} aria-label="Restore brush" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${brush ? "bg-champagne" : "bg-white/20"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${brush ? "left-6" : "left-1"}`} />
            </button>
          </div>
          {brush && (
            <div className="mt-3 flex items-center gap-3 text-[13px] text-stone-light">
              <label htmlFor="brush-size">Brush</label>
              <input id="brush-size" type="range" min={12} max={120} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-[#e4c020]" />
              <button
                onClick={() => {
                  const m = mask.current;
                  if (m) m.getContext("2d")!.clearRect(0, 0, m.width, m.height);
                  setMaskVer((v) => v + 1);
                }}
                className="underline underline-offset-4 hover:text-porcelain"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
      {surfaces.length > 0 && (
        <div>
          <SectionLabel>Traced surfaces</SectionLabel>
          <ul className="space-y-1.5">
            {surfaces.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${s.id === selected ? "bg-white/10 ring-1 ring-champagne/60" : "bg-white/[0.04]"}`}>
                <button onClick={() => setSelected(s.id)} className="flex-1 text-left text-[14px]">
                  {i + 1}. {ZONE_LABEL[s.zone]}
                </button>
                <select
                  aria-label="Approximate width of this surface"
                  value={s.widthMM}
                  onChange={(e) => setSurfaces((ss) => ss.map((x) => (x.id === s.id ? { ...x, widthMM: Number(e.target.value) } : x)))}
                  className="h-8 rounded-full bg-white/10 px-2 text-[12px] text-porcelain"
                >
                  {WIDTHS.map((w) => (
                    <option key={w} value={w} className="bg-ink">
                      ≈ {w / 1000} m wide
                    </option>
                  ))}
                </select>
                <button onClick={() => setSurfaces((ss) => ss.map((x) => (x.id === s.id ? { ...x, rotate: !x.rotate } : x)))} title="Turn the grain 90°" className={`h-8 rounded-full px-2 text-[12px] ${s.rotate ? "bg-champagne text-ink" : "bg-white/10"}`}>
                  Grain {s.rotate ? "↔" : "↕"}
                </button>
                <button onClick={() => setSurfaces((ss) => ss.filter((x) => x.id !== s.id))} aria-label="Remove surface" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[14px] hover:bg-white/20">
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-stone-light">The width sets the grain and pattern scale, so the boards appear at true size.</p>
        </div>
      )}
    </div>,
    // 2: finishes
    <div key="2" className="flex min-h-0 flex-1 flex-col gap-4">
      {usedZones.length === 0 ? (
        <p className="text-[14px] text-stone-light">Trace at least one surface first.</p>
      ) : (
        <>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {usedZones.map((z) => (
              <button
                key={z}
                onClick={() => {
                  const s = surfaces.find((x) => x.zone === z);
                  if (s) setSelected(s.id);
                }}
                aria-pressed={activeZone === z}
                className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] ${activeZone === z ? "bg-porcelain text-ink" : "border border-white/12 text-porcelain/85"}`}
              >
                {ZONE_LABEL[z]}
              </button>
            ))}
          </div>
          {activeFinish && (
            <p className="text-[14px] text-porcelain/85">
              {ZONE_LABEL[activeZone]}: <span className="text-porcelain">{finishLabel(activeFinish)}</span>
            </p>
          )}
          <div className="flex min-h-[380px] flex-1 flex-col">
            <FinishDrawer activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => st.setFinish(activeZone, f.id, `${f.name} on ${ZONE_LABEL[activeZone].toLowerCase()}`)} onToggleFavourite={st.toggleFavourite} />
          </div>
        </>
      )}
    </div>,
    // 3: save
    <div key="3" className="space-y-3">
      <p className="text-[15px] text-porcelain/80">Your kitchen with UnipanelSA boards. Save it, send it to a showroom, or carry the same finishes into the 3D Studio.</p>
      <ul className="space-y-2">
        {usedZones.map((z) => {
          const f = finishById(st.scheme.zones[z]);
          return f ? (
            <li key={z} className="flex items-center gap-3">
              <span className="h-9 w-9 overflow-hidden rounded-lg" style={{ background: f.hex }}>
                {!f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="text-[14px]">
                <span className="block text-stone-light">{ZONE_LABEL[z]}</span>
                <Link href={`/finishes/${f.id}/`} className="link-u">
                  {finishLabel(f)}
                </Link>
              </span>
            </li>
          ) : null;
        })}
      </ul>
      <button onClick={save} className="btn btn-light w-full justify-center">
        Save image
      </button>
      <Link href={`/contact/?type=studio&s=${encodeScheme(st.scheme)}`} className="btn btn-line w-full justify-center text-porcelain">
        <span>Send to showroom</span>
      </Link>
      <Link href={`/studio/?s=${encodeScheme(st.scheme)}`} className="btn btn-line w-full justify-center text-porcelain">
        <span>Open these finishes in the 3D Studio</span>
      </Link>
    </div>,
  ][step];

  const canNext = step === 0 ? !!photo : step === 1 ? surfaces.length > 0 : true;
  const footer = (
    <div className="flex items-center gap-2 border-t border-white/8 bg-[#141413] px-5 py-3.5">
      {photo && step > 0 && (
        <button
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          className="h-11 rounded-full px-3 text-[13px] text-porcelain/80 ring-1 ring-white/15"
        >
          Hold: before
        </button>
      )}
      <div className="ml-auto flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="h-11 rounded-full px-4 text-[14px] text-porcelain/85 ring-1 ring-white/15">
            Back
          </button>
        )}
        {step < 3 && (
          <button disabled={!canNext} onClick={() => setStep(step + 1)} className="h-11 whitespace-nowrap rounded-full bg-porcelain px-5 text-[14px] font-medium text-ink disabled:opacity-40">
            {mobile ? "Next" : `Next: ${STEPS[step + 1]}`}
          </button>
        )}
      </div>
    </div>
  );

  const stepper = (
    <div>
      <div className="flex items-center justify-between text-[12px] text-stone-light">
        <span className="uppercase tracking-[0.16em]">
          Step {step + 1} of 4
        </span>
        <span>{STEPS[step]}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1">
        {STEPS.map((s, i) => (
          <button key={s} aria-label={s} onClick={() => (i === 0 || photo) && setStep(i)} className="py-1.5">
            <span className={`block h-1 rounded-full ${i <= step ? "bg-champagne" : "bg-white/15"}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const stage = (
    <div ref={frame} className="relative h-full w-full overflow-hidden bg-[#0e0e0d]">
      {photo ? (
        <canvas ref={view} className={`absolute inset-0 touch-none ${step === 1 ? "cursor-crosshair" : step === 2 ? "cursor-pointer" : ""}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-8 text-center">
          <div>
            <img src={asset("/inspiration/ambiente-cocina-titan-01-y-titan-03-min-scaled-1.webp")} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" />
            <div className="relative">
              <p className="eyebrow text-champagne">Your kitchen</p>
              <p className="display mt-3 text-[clamp(2rem,4vw,3.4rem)] leading-tight">See our boards in your own room.</p>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-porcelain/75">Snap a photo, trace your doors and worktop, and swap finishes live.</p>
            </div>
          </div>
        </div>
      )}
      {busy && <div className="absolute inset-0 grid place-items-center bg-black/40 text-[14px]">Preparing your photo…</div>}
      {loupe && (
        <canvas ref={loupeRef} className="pointer-events-none absolute h-[120px] w-[120px] rounded-full shadow-2xl ring-2 ring-champagne" style={{ left: loupe.x - 60, top: Math.max(8, loupe.y - 150) }} />
      )}
      {showOriginal && <span className="glass absolute left-4 top-4 rounded-full px-3 py-1.5 text-[13px]">Before</span>}
    </div>
  );

  if (mobile) {
    return (
      <div className="fixed inset-0 flex flex-col bg-ink pt-[var(--nav-h)] text-porcelain">
        <div className="relative h-[46dvh] shrink-0">{stage}</div>
        <section className="flex min-h-0 flex-1 flex-col rounded-t-3xl bg-[#161615]">
          <div className="px-5 pt-4">
            {stepper}
            <h1 className="display mt-3 text-[26px] leading-tight">{STEPS[step]}</h1>
          </div>
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4">{panelBody}</div>
          {footer}
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex gap-3 bg-[#0b0b0a] p-3 pt-[calc(var(--nav-h)+12px)] text-porcelain">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-[22px] ring-1 ring-white/8">{stage}</div>
      <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-[22px] bg-[#161615] ring-1 ring-white/8">
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-champagne">Your kitchen</p>
            <Link href="/studio/" className="text-[13px] text-stone-light hover:text-porcelain">
              ← 3D Studio
            </Link>
          </div>
          <h1 className="display mt-2 text-[34px] leading-[1.05]">
            Try it on <em className="display-italic text-stone-light">your room.</em>
          </h1>
          <div className="mt-5">{stepper}</div>
        </div>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5">
          <h2 className="mb-4 text-[18px]">{STEPS[step]}</h2>
          {panelBody}
        </div>
        {footer}
      </aside>
    </div>
  );
}
