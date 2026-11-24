"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStudio } from "@/lib/store/studio";
import { useSampleBox } from "@/lib/store/sampleBox";
import { finishById, finishLabel } from "@/data/catalogue";
import { COLLECTIONS } from "@/data/collections";
import {
  decodeScheme,
  encodeScheme,
  usedFinishes,
  zonesFor,
  ZONE_LABEL,
  SCENE_LABEL,
  LAYOUT_LABEL,
  STAGING,
  DOOR_ZONES,
  DESIGN_PRESETS,
  hasIsland,
  type CameraPreset,
  type Mood,
  type SceneId,
  type KitchenLayout,
  type Zone,
} from "@/lib/studio/scheme";
import { MOODS } from "@/components/three/Lighting";
import { detectTier, hasWebGL, isMobile, type Tier } from "@/components/three/quality";
import type { StudioHandle } from "@/components/three/StudioCanvas";
import { FinishDrawer } from "./FinishDrawer";
import { asset } from "@/lib/asset";

const StudioCanvas = dynamic(() => import("@/components/three/StudioCanvas"), { ssr: false });

const CAMERAS: { id: CameraPreset; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "eye", label: "Eye level" },
  { id: "island", label: "Island" },
  { id: "detail", label: "Edge detail" },
];

function Chip({ active, onClick, children, label }: { active?: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] transition-colors duration-200 ${active ? "bg-porcelain text-ink" : "border border-white/12 text-porcelain/85 hover:border-white/40 hover:text-porcelain"}`}
    >
      {children}
    </button>
  );
}

function ToolButton({ onClick, children, label, disabled }: { onClick: () => void; children: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className="grid h-10 min-w-10 place-items-center rounded-full px-3 text-[13px] text-porcelain/90 transition-colors hover:bg-white/10 disabled:opacity-35">
      {children}
    </button>
  );
}

export default function StudioApp() {
  const st = useStudio();
  const sample = useSampleBox();
  const canvas = useRef<StudioHandle>(null);
  const [tier, setTier] = useState<Tier>(1);
  const [webgl, setWebgl] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
  const [step, setStep] = useState(1);
  const [split, setSplit] = useState(0.5);
  const [showPalette, setShowPalette] = useState(false);
  const [ar, setAr] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [override, setOverride] = useState<import("@/lib/studio/scheme").Scheme | null>(null);
  const [otherImg, setOtherImg] = useState<string | null>(null);

  // boot: device, tier, shared scheme from URL
  useEffect(() => {
    setWebgl(hasWebGL());
    const forced = new URL(window.location.href).searchParams.get("q");
    setTier(forced === "0" || forced === "1" || forced === "2" ? (Number(forced) as Tier) : detectTier());
    setMobile(isMobile() || window.innerWidth < 1024);
    const url = new URL(window.location.href);
    const s = decodeScheme(url.searchParams.get("s"));
    if (s) st.load(s);
    const z = url.searchParams.get("zone") as Zone | null;
    const f = url.searchParams.get("finish");
    if (f && finishById(f)) {
      const target = z && ZONE_LABEL[z] ? z : "baseDoors";
      st.setFinish(target, f);
      st.select(target);
    } else st.select("baseDoors");
    // actions queued by the concierge from another page
    try {
      const pending = JSON.parse(sessionStorage.getItem("unipanel-pending") || "[]") as { name: string; input: Record<string, string> }[];
      sessionStorage.removeItem("unipanel-pending");
      setTimeout(() => pending.forEach((detail) => window.dispatchEvent(new CustomEvent("unipanel:studio", { detail }))), 50);
    } catch {
      /* ignore */
    }
    import("@/lib/studio/ar").then((m) => setAr(m.supportsQuickLook()));
    useSampleBox.persist.rehydrate();
    setReady(true);
    const onResize = () => setMobile(isMobile() || window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the URL in sync so any moment is shareable
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("s", encodeScheme(st.scheme));
      url.searchParams.delete("finish");
      url.searchParams.delete("zone");
      window.history.replaceState(null, "", url.toString());
    }, 250);
    return () => clearTimeout(t);
  }, [st.scheme, ready]);

  // keyboard: undo / redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) useStudio.getState().redo();
      else useStudio.getState().undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // apply-finish events from the concierge
  useEffect(() => {
    const onAction = (e: Event) => {
      const d = (e as CustomEvent).detail as { name: string; input: Record<string, string> };
      const s = useStudio.getState();
      if (d.name === "apply_finish") {
        const f = finishById(d.input.finishId);
        if (!f) return;
        if (d.input.zone === "allDoors") s.applyToDoors(f.id, f.name);
        else s.setFinish(d.input.zone as Zone, f.id, f.name);
      }
      if (d.name === "set_scene") {
        if (d.input.scene) s.setScene(d.input.scene as SceneId);
        if (d.input.layout) s.setLayout(d.input.layout as KitchenLayout);
      }
    };
    window.addEventListener("unipanel:studio", onAction);
    return () => window.removeEventListener("unipanel:studio", onAction);
  }, []);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout((flash as unknown as { t?: number }).t);
    (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const zones = zonesFor(st.scheme.scene, st.scheme.layout);
  const selected = st.selected && zones.includes(st.selected) ? st.selected : zones[0];
  const activeFinish = finishById(st.scheme.zones[selected]);

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("s", encodeScheme(st.scheme));
    return url.toString();
  };

  const onPick = (id: string) => {
    const f = finishById(id)!;
    st.setFinish(selected, id, `${f.name} on ${ZONE_LABEL[selected].toLowerCase()}`);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      flash("Link copied. It reopens this exact scheme.");
    } catch {
      flash("Copy failed. Use your browser’s share option.");
    }
  };

  const whatsapp = () => {
    const text = `My UnipanelSA surface scheme: ${shareUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const exportPng = async () => {
    if (!canvas.current) return;
    setBusy("png");
    const url = await canvas.current.capture(2);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UnipanelSA-render-${Date.now().toString(36)}.png`;
    a.click();
    setBusy(null);
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMsg, setSheetMsg] = useState("");

  /** Capture a set of camera views for one scheme (optionally rendered via override). */
  const captureViews = async (scheme: import("@/lib/studio/scheme").Scheme | null) => {
    if (!canvas.current) return [];
    const s0 = useStudio.getState();
    const orig = s0.camera;
    const sc = scheme ?? s0.scheme;
    const presets: { id: CameraPreset; name: string }[] = [
      { id: "overview", name: "Overview" },
      { id: "eye", name: "Eye level" },
      ...(sc.scene === "kitchen" && hasIsland(sc.layout) ? [{ id: "island" as CameraPreset, name: "Island" }] : []),
      { id: "detail", name: "Edge detail" },
    ];
    if (scheme) setOverride(scheme);
    const out: { name: string; image: string }[] = [];
    for (const v of presets) {
      useStudio.getState().setCamera(v.id);
      await new Promise((r) => setTimeout(r, 1500));
      out.push({ name: v.name, image: await canvas.current.capture(1.6) });
    }
    if (scheme) setOverride(null);
    useStudio.getState().setCamera(orig);
    return out;
  };

  const makeSheet = async (details: import("@/lib/studio/specSheet").ClientDetails, includeB: boolean) => {
    setBusy("pdf");
    try {
      const { downloadSpecSheet } = await import("@/lib/studio/specSheet");
      const st0 = useStudio.getState();
      const aScheme = st0.slot === "A" ? st0.scheme : st0.other;
      const bScheme = st0.slot === "A" ? st0.other : st0.scheme;
      const link = (sc: import("@/lib/studio/scheme").Scheme) => {
        const u = new URL(window.location.href);
        u.searchParams.set("s", encodeScheme(sc));
        return u.toString();
      };
      setSheetMsg("Capturing views of design A…");
      const designs = [{ label: "Design A", scheme: aScheme, views: await captureViews(st0.slot === "A" ? null : aScheme), shareUrl: link(aScheme) }];
      if (includeB) {
        setSheetMsg("Capturing views of design B…");
        designs.push({ label: "Design B", scheme: bScheme, views: await captureViews(st0.slot === "B" ? null : bScheme), shareUrl: link(bScheme) });
      }
      setSheetMsg("Building the PDF…");
      await downloadSpecSheet(designs, details);
      setSheetOpen(false);
      flash("Your branded spec sheet has downloaded.");
    } catch {
      flash("The spec sheet could not be created. Please try again.");
    }
    setSheetMsg("");
    setBusy(null);
  };

  const orderSamples = () => {
    const ids = [...new Set(usedFinishes(st.scheme).map((u) => u.finish.id))];
    const { added, skipped } = sample.add(ids);
    flash(skipped.length ? `${added.length} added. Your Sample Box holds 8, so ${skipped.length} did not fit.` : `${added.length} finish${added.length === 1 ? "" : "es"} added to your Sample Box.`);
  };

  /** Render the parked design from the same camera and keep it as the other half of the split. */
  const snapOther = useCallback(async () => {
    if (!canvas.current) return;
    const other = useStudio.getState().other;
    setOverride(other);
    await new Promise((r) => setTimeout(r, 650)); // let materials and textures settle
    const img = await canvas.current.capture(1);
    setOverride(null);
    setOtherImg(img);
  }, []);

  // keep the parked design's half in step when the camera or light changes
  useEffect(() => {
    if (!st.comparing) return;
    const t = setTimeout(() => snapOther(), 900);
    return () => clearTimeout(t);
  }, [st.cameraNonce, st.mood]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCompare = async () => {
    if (st.comparing) {
      st.setComparing(false);
      setOtherImg(null);
      return;
    }
    st.setComparing(true);
    await snapOther();
  };

  const switchDesign = async (to: "A" | "B") => {
    if (to === st.slot) return;
    st.switchSlot(to);
    if (useStudio.getState().comparing) await snapOther();
  };

  const openAR = async () => {
    const g = canvas.current?.exportGroup();
    if (!g) return;
    setBusy("ar");
    try {
      const { openQuickLook } = await import("@/lib/studio/ar");
      await openQuickLook(g);
    } catch {
      flash("AR preview isn’t available for this scene on this device.");
    }
    setBusy(null);
  };

  const onHover = (z: Zone | null, pt?: { x: number; y: number }) => {
    st.hover(z);
    setHoverPt(z && pt ? pt : null);
  };

  // ---------- pieces ----------
  const sceneControls = (
    <div className="space-y-3">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Scene">
        {(Object.keys(SCENE_LABEL) as SceneId[]).map((s) => (
          <Chip key={s} active={st.scheme.scene === s} onClick={() => st.setScene(s)}>
            {SCENE_LABEL[s]}
          </Chip>
        ))}
      </div>
      {st.scheme.scene === "kitchen" && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Kitchen layout">
          {(Object.keys(LAYOUT_LABEL) as KitchenLayout[]).map((l) => (
            <Chip key={l} active={st.scheme.layout === l} onClick={() => st.setLayout(l)}>
              {LAYOUT_LABEL[l]}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );

  const zoneList = (
    <div role="radiogroup" aria-label="Surface zone" className="grid grid-cols-2 gap-1.5">
      {zones.map((z) => {
        const f = finishById(st.scheme.zones[z]);
        return (
          <button
            key={z}
            role="radio"
            aria-checked={selected === z}
            onClick={() => st.select(z)}
            onMouseEnter={() => st.hover(z)}
            onMouseLeave={() => st.hover(null)}
            className={`flex items-center gap-2.5 rounded-lg p-1.5 pr-2 text-left transition-colors duration-200 ${selected === z ? "bg-white/12 ring-1 ring-champagne/70" : "hover:bg-white/6"}`}
          >
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded" style={{ background: f?.hex }}>
              {f && !f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-tight text-porcelain">{ZONE_LABEL[z]}</span>
              <span className="block truncate text-[13px] leading-tight text-stone-light">{f ? finishLabel(f) : ""}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const presets = (
    <div className="flex flex-wrap gap-1.5">
      <Chip onClick={() => activeFinish && st.applyToDoors(activeFinish.id, activeFinish.name)} label="Apply the selected finish to all doors">
        Apply to all doors
      </Chip>
      <Chip onClick={() => st.twoTone(st.scheme.zones.wallDoors === "white-matte" ? "kashmir" : "white-matte", "black-matte")}>Two-tone: upper / lower</Chip>
      {st.scheme.scene === "kitchen" && <Chip onClick={() => st.islandContrast(st.scheme.zones.baseDoors === "nogal-rosales-02" ? "black-matte" : "nogal-rosales-02")}>Island contrast</Chip>}
    </div>
  );

  const designs = (
    <div className="grid grid-cols-2 gap-2">
      {DESIGN_PRESETS.map((d) => (
        <button key={d.id} onClick={() => st.applyDesign(d)} className="group rounded-lg p-2 text-left ring-1 ring-white/10 transition-colors hover:bg-white/6 hover:ring-white/30">
          <span className="flex h-9 overflow-hidden rounded">
            {(["baseDoors", "wallDoors", "islandFronts", "splashback", "cladding"] as Zone[]).map((z) => {
              const f = finishById(d.zones[z]);
              return f ? (
                <span key={z} className="h-full flex-1" style={{ background: f.hex }}>
                  {!f.flat && <img src={f.textures.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </span>
              ) : null;
            })}
          </span>
          <span className="mt-1.5 block text-[13px] text-porcelain">{d.name}</span>
          <span className="block text-[13px] leading-snug text-stone-light">{d.note}</span>
        </button>
      ))}
    </div>
  );

  const options = (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1 text-stone-light">Grain</span>
        <Chip active={st.scheme.grain === "v"} onClick={() => st.setOption("grain", "v")}>
          Vertical
        </Chip>
        <Chip active={st.scheme.grain === "h"} onClick={() => st.setOption("grain", "h")}>
          Horizontal
        </Chip>
        <Chip active={st.scheme.bookmatch} onClick={() => st.setOption("bookmatch", !st.scheme.bookmatch)}>
          Bookmatch {st.scheme.bookmatch ? "on" : "off"}
        </Chip>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1 text-stone-light">Build-up</span>
        {([36, 42, 48, 54] as const).map((t) => (
          <Chip key={t} active={st.scheme.buildup === t} onClick={() => st.setOption("buildup", t)}>
            {t}mm
          </Chip>
        ))}
      </div>
      <fieldset className="space-y-2 rounded-lg border border-white/8 p-3">
        <legend className="eyebrow px-1 text-stone-light">Visual staging, not supplied</legend>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-stone-light">Handles</span>
          {STAGING.handles.map((h) => (
            <Chip key={h.id} active={st.scheme.handle === h.id} onClick={() => st.setOption("handle", h.id)}>
              {h.name.replace("Slim bar, ", "Bar ")}
            </Chip>
          ))}
        </div>
        {(["worktop", "floor", "wall"] as const).map((k) => {
          const list = k === "worktop" ? STAGING.worktops : k === "floor" ? STAGING.floors : STAGING.walls;
          return (
            <div key={k} className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 capitalize text-stone-light">{k}</span>
              {list.map((o, i) => (
                <button
                  key={o.name}
                  onClick={() => st.setOption(k, i as 0)}
                  aria-pressed={st.scheme[k] === i}
                  aria-label={`${k}: ${o.name}`}
                  title={o.name}
                  className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[#191917] ${st.scheme[k] === i ? "ring-2 ring-champagne" : "ring-1 ring-white/20"}`}
                  style={{ background: o.color }}
                />
              ))}
            </div>
          );
        })}
      </fieldset>
    </div>
  );

  const actions = (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={orderSamples} className="btn btn-light justify-center !min-h-11 !px-3 !text-[14px]">
        Order samples of this scheme
      </button>
      <Link href={`/contact/?type=studio&s=${encodeScheme(st.scheme)}`} className="btn btn-line justify-center !min-h-11 !px-3 !text-[14px] text-porcelain">
        <span>Send to showroom</span>
      </Link>
      <button onClick={copyLink} className="btn btn-line justify-center !min-h-11 !px-3 !text-[14px] text-porcelain">
        <span>Copy share link</span>
      </button>
      <button onClick={whatsapp} className="btn btn-line justify-center !min-h-11 !px-3 !text-[14px] text-porcelain">
        <span>Share on WhatsApp</span>
      </button>
      <button onClick={exportPng} disabled={!!busy} className="btn btn-line justify-center !min-h-11 !px-3 !text-[14px] text-porcelain">
        <span>{busy === "png" ? "Rendering…" : "Save PNG render"}</span>
      </button>
      <button onClick={() => setSheetOpen(true)} disabled={!!busy} className="btn btn-light col-span-2 justify-center !min-h-11 !px-3 !text-[14px]">
        {busy === "pdf" ? "Preparing PDF…" : "Client spec sheet (branded PDF)"}
      </button>
      {ar && (
        <button onClick={openAR} className="btn btn-line col-span-2 justify-center !min-h-11 !text-[14px] text-porcelain">
          <span>{busy === "ar" ? "Preparing AR…" : "View in your space (AR)"}</span>
        </button>
      )}
    </div>
  );

  const palette = (
    <div>
      <p className="eyebrow mb-3 text-stone-light">My palette</p>
      <ul className="space-y-2">
        {usedFinishes(st.scheme).map((u) => (
          <li key={u.zone} className="flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded" style={{ background: u.finish.hex }}>
              {!u.finish.flat && <img src={u.finish.textures.thumb} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-stone-light">{u.label}</span>
              <Link href={`/finishes/${u.finish.id}/`} className="link-u block truncate text-[14px] text-porcelain">
                {u.finish.name}
              </Link>
            </span>
            <span className="font-mono text-[13px] text-stone-light">{u.finish.code ?? COLLECTIONS.find((c) => c.id === u.finish.collections[0])?.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const HOME_ROOMS = ["Kitchen", "Lounge", "Bedroom & wardrobe", "Bathroom"];
  const homeBar = st.scheme.scene === "home" && (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      <button onClick={() => st.setCamera("overview")} aria-pressed={st.camera !== "walk"} className={`h-9 whitespace-nowrap rounded-full px-3 text-[13px] ${st.camera !== "walk" ? "bg-porcelain text-ink" : "text-porcelain/85 hover:text-porcelain"}`}>
        Dollhouse
      </button>
      <span className="h-5 w-px bg-white/15" />
      {HOME_ROOMS.map((r, i) => (
        <button key={r} onClick={() => st.setHomeRoom(i)} aria-pressed={st.camera === "walk" && st.homeRoom === i} className={`h-9 whitespace-nowrap rounded-full px-3 text-[13px] ${st.camera === "walk" && st.homeRoom === i ? "bg-champagne text-ink" : "text-porcelain/85 hover:text-porcelain"}`}>
          Walk: {r}
        </button>
      ))}
    </div>
  );

  const walking = st.scheme.scene === "home" && st.camera === "walk";
  const padBtn = (key: string, label: string, cls: string) => {
    const send = (down: boolean) => window.dispatchEvent(new CustomEvent("unipanel:walk", { detail: { key, down } }));
    return (
      <button
        aria-label={label}
        className={`absolute grid h-12 w-12 select-none place-items-center rounded-full bg-black/55 text-[18px] text-porcelain ring-1 ring-white/15 backdrop-blur active:bg-champagne active:text-ink ${cls}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          send(true);
        }}
        onPointerUp={() => send(false)}
        onPointerCancel={() => send(false)}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "none" }}
      >
        {label === "Walk forward" ? "↑" : label === "Walk back" ? "↓" : label === "Step left" ? "←" : "→"}
      </button>
    );
  };
  const walkPad = walking && (
    <div className={`absolute z-20 h-36 w-36 ${mobile ? "bottom-[250px] left-3" : "bottom-6 left-6"}`} aria-label="Walk controls">
      {padBtn("w", "Walk forward", "left-12 top-0")}
      {padBtn("s", "Walk back", "bottom-0 left-12")}
      {padBtn("a", "Step left", "left-0 top-12")}
      {padBtn("d", "Step right", "right-0 top-12")}
    </div>
  );

  // ---------- guided steps (desktop panel and mobile wizard share them) ----------
  const STEPS = [
    { id: "room", label: "Room", title: "Choose your room" },
    { id: "surfaces", label: "Surfaces", title: "Pick your finishes" },
    { id: "worktop", label: "Worktop & floor", title: "Worktop, floor & handles" },
    { id: "light", label: "Light", title: "Set the light" },
    { id: "done", label: "Your design", title: "Your design" },
  ] as const;
  const night = st.mood === "night";
  const anyOpen = Object.values(st.opened).some(Boolean);

  const icon = {
    sun: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
    moon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    ),
    bulb: (on: boolean) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
      </svg>
    ),
    door: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M4 3h9v18H4zM13 5l6 2v12l-6 2" />
        <circle cx="10.5" cy="12" r=".8" fill="currentColor" />
      </svg>
    ),
    undo: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </svg>
    ),
    redo: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
      </svg>
    ),
    split: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M12 4v16" />
      </svg>
    ),
    camera: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  };

  const IconBtn = ({ on, onClick, label, children, text }: { on?: boolean; onClick: () => void; label: string; children: React.ReactNode; text?: string }) => (
    <button onClick={onClick} aria-pressed={on} aria-label={label} title={label} className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors ${on ? "bg-champagne text-ink" : "text-porcelain/90 hover:bg-white/10"}`}>
      {children}
      {text && <span className="hidden xl:inline">{text}</span>}
    </button>
  );

  // floating controls over the render
  const stageTopLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="glass flex items-center gap-0.5 rounded-full p-1">
        {(["A", "B"] as const).map((d) => (
          <button key={d} onClick={() => switchDesign(d)} aria-pressed={st.slot === d} title={`Edit design ${d}`} className={`h-9 rounded-full px-3 text-[13px] ${st.slot === d ? "bg-porcelain text-ink" : "text-porcelain/80 hover:text-porcelain"}`}>
            {mobile ? d : `Design ${d}`}
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px bg-white/15" />
        <IconBtn onClick={st.undo} label="Undo">
          {icon.undo}
        </IconBtn>
        <IconBtn onClick={st.redo} label="Redo">
          {icon.redo}
        </IconBtn>
      </div>
      {homeBar}
    </div>
  );

  const stageTopRight = (
    <div className="glass flex items-center gap-0.5 rounded-full p-1" role="group" aria-label="Room">
      <IconBtn onClick={() => st.setMood(night ? "morning" : "night")} label={night ? "Switch to daylight" : "Switch to night"} text={night ? "Night" : "Day"}>
        {night ? icon.moon : icon.sun}
      </IconBtn>
      <IconBtn on={st.lightsOn} onClick={() => st.setLights(!st.lightsOn)} label={st.lightsOn ? "Switch the lights off" : "Switch the lights on"} text="Lights">
        {icon.bulb(st.lightsOn)}
      </IconBtn>
      <IconBtn on={st.openMode} onClick={() => st.setOpenMode(!st.openMode)} label="Open doors and drawers" text="Open doors">
        {icon.door}
      </IconBtn>
      {anyOpen && (
        <button onClick={st.closeAll} className="h-9 rounded-full px-2.5 text-[13px] text-porcelain/90 hover:bg-white/10">
          Close all
        </button>
      )}
      <IconBtn on={st.comparing} onClick={toggleCompare} label={st.comparing ? "Exit compare" : "Compare design A and B"} text="Compare">
        {icon.split}
      </IconBtn>
    </div>
  );

  const cameraChips = (
    <div className="glass no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1">
      {CAMERAS.filter((c) => (st.scheme.scene === "home" ? c.id === "detail" || c.id === "overview" : c.id !== "island" || (st.scheme.scene === "kitchen" && hasIsland(st.scheme.layout)))).map((c) => (
        <button key={c.id} onClick={() => st.setCamera(c.id)} aria-pressed={st.camera === c.id} className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors ${st.camera === c.id ? "bg-porcelain text-ink" : "text-porcelain/85 hover:text-porcelain"}`}>
          {c.id === "overview" && st.scheme.scene === "home" ? "Dollhouse" : c.label}
        </button>
      ))}
    </div>
  );

  // the selected surface, shown on the render like the reference's floating card
  const selectedCard = activeFinish && (
    <button onClick={() => setStep(1)} className="glass flex max-w-[min(340px,100%)] items-center gap-3 rounded-2xl p-2 pr-4 text-left">
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl" style={{ background: activeFinish.hex }}>
        {!activeFinish.flat && <img src={activeFinish.textures.thumb} alt="" className="h-full w-full object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] uppercase tracking-[0.14em] text-stone-light">{ZONE_LABEL[selected]}</span>
        <span className="block truncate text-[14px] text-porcelain">{finishLabel(activeFinish)}</span>
      </span>
    </button>
  );

  const hint = st.scheme.scene === "home" && st.camera === "walk" ? "Drag to look around · W A S D or scroll to walk" : st.openMode ? "Click any door or drawer to open it · click the tap to run it" : "Drag to orbit · click a surface to change it · double-click a door to open it";

  // ---- step contents ----
  const SectionLabel = ({ children }: { children: React.ReactNode }) => <p className="mb-2.5 text-[12px] uppercase tracking-[0.16em] text-stone-light">{children}</p>;

  const stepRoom = (
    <div className="space-y-7">
      <div>
        <SectionLabel>Room</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SCENE_LABEL) as SceneId[]).map((s) => (
            <button key={s} onClick={() => st.setScene(s)} aria-pressed={st.scheme.scene === s} className={`rounded-xl px-3 py-3 text-left text-[13px] transition-colors ${st.scheme.scene === s ? "bg-porcelain text-ink" : "bg-white/[0.05] text-porcelain/85 hover:bg-white/10"}`}>
              {SCENE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      {st.scheme.scene === "kitchen" && (
        <div>
          <SectionLabel>Layout</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LAYOUT_LABEL) as KitchenLayout[]).map((l) => (
              <button key={l} onClick={() => st.setLayout(l)} aria-pressed={st.scheme.layout === l} className={`rounded-xl px-3 py-3 text-left text-[13px] transition-colors ${st.scheme.layout === l ? "bg-porcelain text-ink" : "bg-white/[0.05] text-porcelain/85 hover:bg-white/10"}`}>
                {LAYOUT_LABEL[l]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <SectionLabel>Start from a look</SectionLabel>
        {designs}
      </div>
      <Link href="/studio/photo/" className="group flex items-center gap-4 rounded-2xl bg-champagne/10 p-4 ring-1 ring-champagne/40 transition-colors hover:bg-champagne/15">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-champagne text-ink">{icon.camera}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-porcelain">Use a photo of your kitchen</span>
          <span className="block text-[13px] text-stone-light">Snap your room and try our finishes on it, live.</span>
        </span>
        <span className="text-champagne transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </div>
  );

  const stepSurfaces = (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div>
        <SectionLabel>1 · Choose a surface</SectionLabel>
        {zoneList}
      </div>
      <div className="flex min-h-[420px] flex-1 flex-col">
        <SectionLabel>
          2 · Finish for <span className="text-porcelain">{ZONE_LABEL[selected]}</span>
        </SectionLabel>
        <FinishDrawer activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => onPick(f.id)} onToggleFavourite={st.toggleFavourite} />
      </div>
      <div>
        <SectionLabel>Quick moves</SectionLabel>
        {presets}
      </div>
    </div>
  );

  const swatchCard = (on: boolean, onClick: () => void, name: string, bg: React.CSSProperties, sub?: string) => (
    <button key={name} onClick={onClick} aria-pressed={on} className={`group overflow-hidden rounded-xl text-left transition-[box-shadow,transform] ${on ? "ring-2 ring-champagne" : "ring-1 ring-white/10 hover:ring-white/30"}`}>
      <span className="block h-14 w-full transition-transform duration-500 group-hover:scale-105" style={bg} />
      <span className="block bg-white/[0.04] px-2.5 py-2">
        <span className="block truncate text-[13px] text-porcelain">{name}</span>
        {sub && <span className="block truncate text-[12px] text-stone-light">{sub}</span>}
      </span>
    </button>
  );
  const FLOOR_BG: React.CSSProperties[] = [
    { background: "repeating-linear-gradient(90deg,#b9a389 0 22px,#a68f74 22px 23px,#c2ad93 23px 45px,#9f876b 45px 46px)" },
    { background: "radial-gradient(circle at 30% 40%,#a49e96,#8f8a83)" },
    { background: "linear-gradient(90deg,#3a3936 0 49%,#2a2927 49% 51%,#403f3b 51%)" },
    { background: "linear-gradient(#eeede9,#eeede9) padding-box, repeating-linear-gradient(90deg,transparent 0 47px,#cfccc6 47px 49px), repeating-linear-gradient(0deg,#eeede9 0 26px,#cfccc6 26px 28px)" },
    { backgroundImage: `url(${asset("/tex/calacatta-bianco.jpg")})`, backgroundSize: "cover" },
    { background: "repeating-linear-gradient(45deg,#b48a5e 0 12px,#a27a50 12px 13px,#c09669 13px 25px,#9c744b 25px 26px), #b48a5e" },
  ];
  const stepWorktop = (
    <div className="space-y-7">
      <div>
        <SectionLabel>Worktop</SectionLabel>
        <div className="grid grid-cols-3 gap-2">{STAGING.worktops.map((o, i) => swatchCard(st.scheme.worktop === i, () => st.setOption("worktop", i as 0), o.name, { background: o.color }))}</div>
      </div>
      <div>
        <SectionLabel>Floor</SectionLabel>
        <div className="grid grid-cols-3 gap-2">{STAGING.floors.map((o, i) => swatchCard(st.scheme.floor === i, () => st.setOption("floor", i as 0), o.name, FLOOR_BG[i] ?? { background: o.color }))}</div>
      </div>
      <div>
        <SectionLabel>Walls</SectionLabel>
        <div className="grid grid-cols-3 gap-2">{STAGING.walls.map((o, i) => swatchCard(st.scheme.wall === i, () => st.setOption("wall", i as 0), o.name, { background: o.color }))}</div>
      </div>
      <div>
        <SectionLabel>Handles</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {STAGING.handles.map((h) => (
            <Chip key={h.id} active={st.scheme.handle === h.id} onClick={() => st.setOption("handle", h.id)}>
              {h.name.replace("Slim bar, ", "Bar, ")}
            </Chip>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-stone-light">Worktop, floor, walls and handles are visual staging to show the boards in context. UnipanelSA supplies the boards and panels.</p>
    </div>
  );

  const MOOD_ORDER: Mood[] = ["morning", "golden", "evening", "night", "gallery"];
  const MOOD_BG: Record<Mood, string> = {
    morning: "linear-gradient(135deg,#dfe9f5,#fff6e2)",
    golden: "linear-gradient(135deg,#f6c486,#c9784a)",
    evening: "linear-gradient(135deg,#6b4a33,#2a1d14)",
    night: "linear-gradient(135deg,#1b2638,#05070a)",
    gallery: "linear-gradient(135deg,#f4f4f2,#cfcfcb)",
  };
  const stepLight = (
    <div className="space-y-7">
      <div>
        <SectionLabel>Time of day</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {MOOD_ORDER.map((m) => (
            <button key={m} onClick={() => st.setMood(m)} aria-pressed={st.mood === m} className={`overflow-hidden rounded-xl text-left ${st.mood === m ? "ring-2 ring-champagne" : "ring-1 ring-white/10 hover:ring-white/30"}`}>
              <span className="block h-12" style={{ background: MOOD_BG[m] }} />
              <span className="block bg-white/[0.04] px-3 py-2 text-[13px] text-porcelain">{MOODS[m].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] p-4">
        <div>
          <p className="text-[15px] text-porcelain">Room lights</p>
          <p className="text-[13px] text-stone-light">Downlights, LED strips and pendants. Or click the switch on the wall.</p>
        </div>
        <button onClick={() => st.setLights(!st.lightsOn)} role="switch" aria-checked={st.lightsOn} aria-label="Room lights" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${st.lightsOn ? "bg-champagne" : "bg-white/20"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${st.lightsOn ? "left-6" : "left-1"}`} />
        </button>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] p-4">
        <div>
          <p className="text-[15px] text-porcelain">Open doors & drawers</p>
          <p className="text-[13px] text-stone-light">Click any front to open it and see inside. Click the tap to run it.</p>
        </div>
        <button onClick={() => st.setOpenMode(!st.openMode)} role="switch" aria-checked={st.openMode} aria-label="Open doors mode" className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${st.openMode ? "bg-champagne" : "bg-white/20"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${st.openMode ? "left-6" : "left-1"}`} />
        </button>
      </div>
      <div>
        <SectionLabel>Board details</SectionLabel>
        <div className="space-y-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 text-stone-light">Grain</span>
            <Chip active={st.scheme.grain === "v"} onClick={() => st.setOption("grain", "v")}>
              Vertical
            </Chip>
            <Chip active={st.scheme.grain === "h"} onClick={() => st.setOption("grain", "h")}>
              Horizontal
            </Chip>
            <Chip active={st.scheme.bookmatch} onClick={() => st.setOption("bookmatch", !st.scheme.bookmatch)}>
              Bookmatch {st.scheme.bookmatch ? "on" : "off"}
            </Chip>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 text-stone-light">Build-up</span>
            {([36, 42, 48, 54] as const).map((t) => (
              <Chip key={t} active={st.scheme.buildup === t} onClick={() => st.setOption("buildup", t)}>
                {t}mm
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const stepDone = (
    <div className="space-y-7">
      {palette}
      {actions}
      <div className="flex flex-wrap gap-2 text-[13px]">
        <button onClick={() => { st.copyToOther(); flash(`Design ${st.slot === "A" ? "B" : "A"} now starts from design ${st.slot}.`); }} className="text-stone-light underline-offset-4 hover:text-porcelain hover:underline">
          Copy to design {st.slot === "A" ? "B" : "A"}
        </button>
        <span className="text-white/20">·</span>
        <button onClick={st.reset} className="text-stone-light underline-offset-4 hover:text-porcelain hover:underline">
          Reset design
        </button>
      </div>
    </div>
  );

  const stepBody = [stepRoom, stepSurfaces, stepWorktop, stepLight, stepDone][step];

  const stepper = (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[12px] uppercase tracking-[0.16em] text-stone-light">
          Step {step + 1} of {STEPS.length}
        </p>
        <p className="text-[12px] text-stone-light">{STEPS[step].label}</p>
      </div>
      <div className="mt-2.5 grid grid-cols-5 gap-1" role="tablist" aria-label="Studio steps">
        {STEPS.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={step === i} aria-label={s.label} onClick={() => setStep(i)} className="group py-1.5">
            <span className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-champagne" : "bg-white/15 group-hover:bg-white/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const usedDots = (
    <div className="flex items-center -space-x-1.5">
      {usedFinishes(st.scheme)
        .slice(0, mobile ? 4 : 6)
        .map((u) => (
          <span key={u.zone} title={`${u.label}: ${u.finish.name}`} className="h-7 w-7 overflow-hidden rounded-full ring-2 ring-[#161615]" style={{ background: u.finish.hex }}>
            {!u.finish.flat && <img src={u.finish.textures.thumb} alt="" className="h-full w-full object-cover" />}
          </span>
        ))}
    </div>
  );

  const footer = (
    <div className="flex items-center gap-3 border-t border-white/8 bg-[#141413] px-5 py-3.5">
      {usedDots}
      <div className="ml-auto flex items-center gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="h-11 rounded-full px-4 text-[14px] text-porcelain/85 ring-1 ring-white/15 hover:ring-white/40">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} className="h-11 whitespace-nowrap rounded-full bg-porcelain px-5 text-[14px] font-medium text-ink hover:bg-champagne">
            {mobile ? "Next" : `Next: ${STEPS[step + 1].label}`}
          </button>
        ) : (
          <Link href={`/contact/?type=studio&s=${encodeScheme(st.scheme)}`} className="grid h-11 place-items-center rounded-full bg-champagne px-5 text-[14px] font-medium text-ink">
            Send to showroom
          </Link>
        )}
      </div>
    </div>
  );

  const stage = (
    <div className="relative h-full w-full overflow-hidden bg-[#0e0e0d]">
      {!ready ? null : webgl ? (
        <StudioCanvas
          handle={canvas}
          scheme={override ?? st.scheme}
          mood={st.mood}
          camera={st.camera}
          cameraNonce={st.cameraNonce}
          homeRoom={st.homeRoom}
          onRoom={(i) => st.setHomeRoom(i)}
          tier={tier}
          selected={selected}
          hovered={st.hovered}
          interactive
          lockControls={st.comparing}
          onHover={onHover}
          onSelect={(z) => {
            st.select(z);
            setStep(1);
          }}
          lightsOn={st.lightsOn}
          onLights={() => st.setLights(!st.lightsOn)}
          opened={st.opened}
          openMode={st.openMode && !st.comparing}
          onToggle={st.toggleOpen}
        />
      ) : (
        <FallbackStage />
      )}
      {/* skeleton while the 3D bundle streams in */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <img src={asset("/inspiration/ALVIC-Hermosilla-77_Zenit-Metal-Plus-Kitchen-min-scaled-1.webp")} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        <div className="relative h-px w-48 overflow-hidden bg-white/15">
          <div className="h-full w-1/3 animate-[load_1.2s_ease-in-out_infinite] bg-champagne" />
        </div>
      </div>

      {st.comparing && otherImg && (
        <div className="absolute inset-0 select-none">
          {/* the parked design: A sits left of the line, B right of it */}
          <img
            src={otherImg}
            alt={`Design ${st.slot === "A" ? "B" : "A"}`}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: st.slot === "B" ? `inset(0 ${100 - split * 100}% 0 0)` : `inset(0 0 0 ${split * 100}%)` }}
          />
          <div className="absolute inset-y-0" style={{ left: `${split * 100}%` }}>
            <div className="absolute inset-y-0 -left-px w-0.5 bg-porcelain/90" />
            <div className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-porcelain text-[13px] text-ink shadow-lg">A|B</div>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={Math.round(split * 100)}
            onChange={(e) => setSplit(Number(e.target.value) / 100)}
            aria-label="Compare split position"
            className="absolute inset-x-0 top-1/2 h-14 w-full -translate-y-1/2 cursor-ew-resize opacity-0"
          />
          <span className="eyebrow pointer-events-none absolute left-4 top-20 rounded-full bg-black/55 px-3 py-1.5 text-porcelain">Design A{st.slot === "A" ? " · editing" : ""}</span>
          <span className="eyebrow pointer-events-none absolute right-4 top-20 rounded-full bg-black/55 px-3 py-1.5 text-porcelain">Design B{st.slot === "B" ? " · editing" : ""}</span>
        </div>
      )}

      {hoverPt && st.hovered && !mobile && (
        <div className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-[140%] rounded-full bg-ink/85 px-3 py-1.5 text-[13px] text-porcelain backdrop-blur" style={{ left: hoverPt.x, top: hoverPt.y }}>
          {ZONE_LABEL[st.hovered]} · {finishById(st.scheme.zones[st.hovered])?.name}
        </div>
      )}

      {walkPad}
      {showPalette && (
        <div className="glass absolute bottom-4 left-4 z-10 w-[min(360px,calc(100%-2rem))] rounded-2xl p-4 text-porcelain max-lg:bottom-[250px]">
          <button onClick={() => setShowPalette(false)} className="absolute right-3 top-3 text-[13px] text-stone-light hover:text-porcelain" aria-label="Close palette">
            Close
          </button>
          {palette}
        </div>
      )}
    </div>
  );

  const live = (
    <p className="sr-only" aria-live="polite">
      {st.announce}
    </p>
  );

  const sheetModal = sheetOpen && createPortal(<SheetForm busy={busy === "pdf"} msg={sheetMsg} onClose={() => !busy && setSheetOpen(false)} onSubmit={makeSheet} />, document.body);

  const toastEl = toast && (
    <div role="status" className="glass fixed left-1/2 top-[calc(var(--nav-h)+12px)] z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-[14px] text-porcelain shadow-xl">
      {toast}
    </div>
  );

  if (mobile) {
    // phone: the render on top, a step-by-step wizard below (like a guided configurator)
    return (
      <div className="fixed inset-0 flex flex-col bg-ink pt-[var(--nav-h)] text-porcelain">
        {live}
        {toastEl}
        {sheetModal}
        <div className="relative h-[46dvh] shrink-0 overflow-hidden">
          {stage}
          <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
            {stageTopLeft}
            <div className="glass flex items-center gap-0.5 rounded-full p-1">
              <IconBtn onClick={() => st.setMood(night ? "morning" : "night")} label={night ? "Switch to daylight" : "Switch to night"}>
                {night ? icon.moon : icon.sun}
              </IconBtn>
              <IconBtn on={st.lightsOn} onClick={() => st.setLights(!st.lightsOn)} label="Room lights">
                {icon.bulb(st.lightsOn)}
              </IconBtn>
              <IconBtn on={st.openMode} onClick={() => st.setOpenMode(!st.openMode)} label="Open doors and drawers">
                {icon.door}
              </IconBtn>
            </div>
          </div>
          <div className="absolute inset-x-3 bottom-3 z-10 flex justify-center">{cameraChips}</div>
        </div>
        <section aria-label="Studio controls" className="flex min-h-0 flex-1 flex-col rounded-t-3xl bg-[#161615] shadow-[0_-20px_40px_rgba(0,0,0,.4)]">
          <div className="px-5 pt-4">
            {stepper}
            <h2 className="display mt-3 text-[26px] leading-tight">{STEPS[step].title}</h2>
          </div>
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4">{step === 1 ? <div className="flex flex-col gap-5">
            <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5" role="radiogroup" aria-label="Surface zone">
              {zones.map((z) => (
                <Chip key={z} active={selected === z} onClick={() => st.select(z)}>
                  {ZONE_LABEL[z]}
                </Chip>
              ))}
            </div>
            <div className="flex h-[420px] flex-col">
              <FinishDrawer layout="grid" activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => onPick(f.id)} onToggleFavourite={st.toggleFavourite} />
            </div>
            {presets}
          </div> : stepBody}</div>
          <div className="pb-[max(env(safe-area-inset-bottom),0px)]">{footer}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex gap-3 bg-[#0b0b0a] p-3 pt-[calc(var(--nav-h)+12px)] text-porcelain">
      {live}
      {toastEl}
      {sheetModal}
      {/* the render, framed */}
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-[22px] ring-1 ring-white/8">
        {stage}
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3 [&>*]:pointer-events-auto">
          {stageTopLeft}
          {stageTopRight}
        </div>
        {/* bottom-left: the selected surface and the camera views; bottom-right stays clear for the concierge */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-48 z-10 flex flex-col items-start gap-2 [&>*]:pointer-events-auto">
          {selectedCard}
          {cameraChips}
          <p className="caption pointer-events-none hidden pl-2 text-[12px] text-porcelain/55 2xl:block">{hint}</p>
        </div>
      </div>
      {/* the guided panel */}
      <aside aria-label="Studio controls" className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-[22px] bg-[#161615] ring-1 ring-white/8">
        <div className="px-6 pt-6">
          <p className="eyebrow text-champagne">The Studio</p>
          <h1 className="display mt-2 text-[34px] leading-[1.05]">
            Design your kitchen <em className="display-italic text-stone-light">live.</em>
          </h1>
          <div className="mt-5">{stepper}</div>
        </div>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5">
          <h2 className="mb-4 text-[18px] text-porcelain">{STEPS[step].title}</h2>
          {stepBody}
        </div>
        {footer}
      </aside>
    </div>
  );
}

/** Client and project details for the branded spec sheet. Remembers the consultant's own details on this device. */
function SheetForm({ busy, msg, onClose, onSubmit }: { busy: boolean; msg: string; onClose: () => void; onSubmit: (d: import("@/lib/studio/specSheet").ClientDetails, includeB: boolean) => void }) {
  const [includeB, setIncludeB] = useState(false);
  const [err, setErr] = useState("");
  let saved: Record<string, string> = {};
  try {
    saved = JSON.parse(localStorage.getItem("unipanel-sheet") || "{}");
  } catch {
    /* ignore */
  }
  const field = (name: string, label: string, opts: { type?: string; span?: boolean; required?: boolean } = {}) => (
    <div className={`field ${opts.span ? "sm:col-span-2" : ""}`}>
      <label htmlFor={`sh-${name}`}>
        {label}
        {opts.required ? " *" : ""}
      </label>
      {opts.type === "textarea" ? <textarea id={`sh-${name}`} name={name} rows={3} defaultValue={saved[name] ?? ""} /> : <input id={`sh-${name}`} name={name} type={opts.type ?? "text"} defaultValue={saved[name] ?? ""} />}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Client spec sheet" onClick={onClose}>
      <form
        className="section-dark max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 ring-1 ring-white/10 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const d = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()])) as Record<string, string>;
          if (!d.client) return setErr("Please add the client’s name.");
          setErr("");
          try {
            localStorage.setItem("unipanel-sheet", JSON.stringify({ consultant: d.consultant, company: d.company, email: d.email, phone: d.phone, city: d.city }));
          } catch {
            /* ignore */
          }
          onSubmit({ client: d.client, project: d.project, address: d.address, consultant: d.consultant, company: d.company, email: d.email, phone: d.phone, city: (d.city as "jhb") || "jhb", notes: d.notes }, includeB);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-champagne">Client spec sheet</p>
            <h2 className="display mt-2 text-[34px]">A branded PDF of this scheme</h2>
            <p className="caption mt-2 text-stone-light">Cover, rendered views, the full finish schedule with codes, finish and care cards, and a sign-off page.</p>
          </div>
          <button type="button" onClick={onClose} className="text-[13px] text-stone-light hover:text-porcelain">
            Close
          </button>
        </div>
        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {field("client", "Client name", { required: true })}
          {field("project", "Project name")}
          {field("address", "Site address", { span: true })}
          {field("consultant", "Prepared by")}
          {field("company", "Company / practice")}
          {field("email", "Email", { type: "email" })}
          {field("phone", "Phone", { type: "tel" })}
          <div className="field sm:col-span-2">
            <label htmlFor="sh-city">Showroom</label>
            <select id="sh-city" name="city" defaultValue={saved.city ?? "jhb"}>
              <option value="jhb" className="text-ink">Johannesburg</option>
              <option value="cpt" className="text-ink">Cape Town</option>
              <option value="dbn" className="text-ink">Durban</option>
            </select>
          </div>
          {field("notes", "Notes for the client", { type: "textarea", span: true })}
        </div>
        <label className="mt-5 flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={includeB} onChange={(e) => setIncludeB(e.target.checked)} className="h-5 w-5 accent-[#e4c020]" />
          Include design B as well
        </label>
        {err && <p className="mt-3 text-[13px] text-[#e29a85]">{err}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn btn-light">
            {busy ? "Preparing…" : "Download PDF"}
          </button>
          <span className="caption text-stone-light" aria-live="polite">
            {msg}
          </span>
        </div>
      </form>
    </div>
  );
}

/** Used when WebGL is unavailable: same zones, shown as the real product renders. */
function FallbackStage() {
  const scheme = useStudio((s) => s.scheme);
  const select = useStudio((s) => s.select);
  const zones = zonesFor(scheme.scene, scheme.layout);
  return (
    <div className="h-full overflow-y-auto p-6">
      <p className="lede max-w-xl text-porcelain/85">3D isn’t available on this device, so here is your scheme as product renders. Everything else works the same.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {zones.map((z) => {
          const f = finishById(scheme.zones[z])!;
          return (
            <button key={z} onClick={() => select(z)} className="text-left">
              <img src={f.textures.swatch} alt={`${f.name} render`} className="aspect-[4/5] w-full rounded-lg bg-black object-cover" />
              <span className="mt-2 block text-[13px] text-stone-light">{ZONE_LABEL[z]}</span>
              <span className="block text-[15px]">{finishLabel(f)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DOOR_ZONES };
