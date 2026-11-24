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
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
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

  const viewControls = (
    <div className="glass flex items-center gap-1 rounded-full p-1">
      <label className="sr-only" htmlFor="mood">
        Lighting mood
      </label>
      <select id="mood" value={st.mood} onChange={(e) => st.setMood(e.target.value as Mood)} className="h-9 rounded-full bg-transparent px-3 text-[13px] text-porcelain focus:outline-none">
        {(Object.keys(MOODS) as Mood[]).map((m) => (
          <option key={m} value={m} className="bg-ink">
            {MOODS[m].label}
          </option>
        ))}
      </select>
      <span className="h-5 w-px bg-white/15" />
      {CAMERAS.filter((c) => (st.scheme.scene === "home" ? c.id === "detail" : c.id !== "island" || (st.scheme.scene === "kitchen" && hasIsland(st.scheme.layout)))).map((c) => (
        <button key={c.id} onClick={() => st.setCamera(c.id)} aria-pressed={st.camera === c.id} className={`h-9 whitespace-nowrap rounded-full px-3 text-[13px] ${st.camera === c.id ? "bg-porcelain text-ink" : "text-porcelain/85 hover:text-porcelain"}`}>
          {c.label}
        </button>
      ))}
    </div>
  );

  const night = st.mood === "night";
  const anyOpen = Object.values(st.opened).some(Boolean);
  const roomControls = (
    <div className="glass flex items-center gap-0.5 rounded-full p-1" role="group" aria-label="Room">
      <button
        onClick={() => st.setMood(night ? "morning" : "night")}
        aria-label={night ? "Switch to daylight" : "Switch to night"}
        title={night ? "Daylight" : "Night"}
        className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-porcelain/90 hover:bg-white/10"
      >
        {night ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
        <span className="hidden sm:inline">{night ? "Night" : "Day"}</span>
      </button>
      <button
        onClick={() => st.setLights(!st.lightsOn)}
        aria-pressed={st.lightsOn}
        aria-label={st.lightsOn ? "Switch the lights off" : "Switch the lights on"}
        title="Light switch"
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors ${st.lightsOn ? "bg-champagne text-ink" : "text-porcelain/90 hover:bg-white/10"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={st.lightsOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
        </svg>
        <span className="hidden sm:inline">Lights</span>
      </button>
      <button
        onClick={() => st.setOpenMode(!st.openMode)}
        aria-pressed={st.openMode}
        title="Tap any door or drawer to open it"
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors ${st.openMode ? "bg-porcelain text-ink" : "text-porcelain/90 hover:bg-white/10"}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M4 3h9v18H4zM13 5l6 2v12l-6 2" />
          <circle cx="10.5" cy="12" r=".8" fill="currentColor" />
        </svg>
        <span className="hidden sm:inline">Open doors</span>
      </button>
      {anyOpen && (
        <button onClick={st.closeAll} className="h-9 rounded-full px-3 text-[13px] text-porcelain/90 hover:bg-white/10">
          Close all
        </button>
      )}
    </div>
  );

  const history = (
    <div className="glass flex items-center rounded-full p-1">
      <ToolButton onClick={st.undo} disabled={!st.past.length} label="Undo">
        Undo
      </ToolButton>
      <ToolButton onClick={st.redo} disabled={!st.future.length} label="Redo">
        Redo
      </ToolButton>
      <ToolButton onClick={st.reset} label="Reset scheme">
        Reset
      </ToolButton>
      <ToolButton onClick={() => { st.copyToOther(); flash(`Design ${st.slot === "A" ? "B" : "A"} now starts from design ${st.slot}.`); }} label="Copy this design into the other slot">
        Copy to {st.slot === "A" ? "B" : "A"}
      </ToolButton>
      <span className="h-5 w-px bg-white/15" />
      {(["A", "B"] as const).map((d) => (
        <button key={d} onClick={() => switchDesign(d)} aria-pressed={st.slot === d} title={`Edit design ${d}`} className={`h-9 rounded-full px-3 text-[13px] ${st.slot === d ? "bg-champagne text-ink" : "text-porcelain/85 hover:text-porcelain"}`}>
          Design {d}
        </button>
      ))}
      <ToolButton onClick={toggleCompare} label={st.comparing ? "Exit compare" : "Compare design A and B side by side"}>
        {st.comparing ? "Exit compare" : "Compare"}
      </ToolButton>
      <ToolButton onClick={() => setShowPalette((v) => !v)} label="Show palette">
        Palette
      </ToolButton>
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
            if (mobile && sheet === "peek") setSheet("half");
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
    const heights = { peek: 236, half: 0.56, full: 0.9 };
    const h = sheet === "peek" ? `${heights.peek}px` : `${heights[sheet] * 100}dvh`;
    return (
      <div className="fixed inset-0 bg-ink pt-[var(--nav-h)] text-porcelain">
        {live}
        {toastEl}
        {sheetModal}
        <div className="absolute inset-0 top-[var(--nav-h)]">{stage}</div>
        <div className="absolute left-0 right-0 top-[calc(var(--nav-h)+8px)] z-10 flex flex-col gap-2 px-3">
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
            <div className="glass shrink-0 rounded-full p-1">
              <label htmlFor="m-scene" className="sr-only">
                Scene
              </label>
              <select id="m-scene" value={st.scheme.scene} onChange={(e) => st.setScene(e.target.value as SceneId)} className="h-9 rounded-full bg-transparent px-3 text-[13px] text-porcelain focus:outline-none">
                {(Object.keys(SCENE_LABEL) as SceneId[]).map((sc) => (
                  <option key={sc} value={sc} className="bg-ink">
                    {SCENE_LABEL[sc]}
                  </option>
                ))}
              </select>
            </div>
            {homeBar && <div className="shrink-0">{homeBar}</div>}
            <div className="shrink-0">{viewControls}</div>
            <div className="shrink-0">{roomControls}</div>
            <div className="shrink-0">{history}</div>
          </div>
        </div>
        <section
          aria-label="Studio controls"
          className="glass absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl px-4 pb-[max(env(safe-area-inset-bottom),12px)] transition-[height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ height: h }}
        >
          <button
            className="mx-auto flex h-7 w-full items-center justify-center"
            aria-label={sheet === "full" ? "Collapse controls" : "Expand controls"}
            onClick={() => setSheet(sheet === "peek" ? "half" : sheet === "half" ? "full" : "peek")}
            onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.y = String(e.touches[0].clientY))}
            onTouchEnd={(e) => {
              const y0 = Number((e.currentTarget as HTMLElement).dataset.y);
              const dy = e.changedTouches[0].clientY - y0;
              if (dy < -30) setSheet(sheet === "peek" ? "half" : "full");
              else if (dy > 30) setSheet(sheet === "full" ? "half" : "peek");
            }}
          >
            <span className="h-1 w-10 rounded-full bg-white/30" />
          </button>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label="Surface zone">
            {zones.map((z) => (
              <Chip key={z} active={selected === z} onClick={() => st.select(z)}>
                {ZONE_LABEL[z]}
              </Chip>
            ))}
          </div>
          {sheet === "peek" ? (
            <FinishDrawer layout="carousel" bare activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => onPick(f.id)} onToggleFavourite={st.toggleFavourite} />
          ) : (
            <div className="no-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto pb-8">
              <FinishDrawer layout={sheet === "half" ? "carousel" : "grid"} activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => onPick(f.id)} onToggleFavourite={st.toggleFavourite} />
              {sceneControls}
              {designs}
              {presets}
              {options}
              {palette}
              {actions}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-ink pt-[var(--nav-h)] text-porcelain">
      {live}
      {toastEl}
      {sheetModal}
      <div className="relative min-w-0 flex-1">
        {stage}
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {viewControls}
          {roomControls}
          {history}
          {homeBar}
        </div>
        <p className="caption pointer-events-none absolute bottom-4 right-4 text-stone-light">
          {st.scheme.scene === "home" && st.camera === "walk" ? "Drag to look around · W A S D, arrow keys or scroll to walk · click a surface to select it" : st.openMode ? "Click any door or drawer to open it · click the tap to run it" : "Drag to orbit · scroll to zoom · click a surface to select it · double-click a door to open it"}
        </p>
      </div>
      <aside aria-label="Studio controls" className="flex w-[440px] shrink-0 flex-col border-l border-white/8 bg-[#191917]">
        <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <p className="eyebrow text-champagne">The Studio</p>
            <h1 className="display mt-2 text-[40px]">Your kitchen, before it exists.</h1>
          </div>
          {sceneControls}
          <div>
            <p className="eyebrow mb-2 text-stone-light">01 · Choose a surface</p>
            {zoneList}
          </div>
          <div className="flex h-[560px] flex-col">
            <p className="eyebrow mb-2 text-stone-light">
              02 · Apply a finish to <span className="text-porcelain">{ZONE_LABEL[selected]}</span>
            </p>
            <FinishDrawer activeId={activeFinish?.id} recent={st.recent} favourites={st.favourites} onPick={(f) => onPick(f.id)} onToggleFavourite={st.toggleFavourite} />
          </div>
          <div>
            <p className="eyebrow mb-2 text-stone-light">03 · Designs</p>
            {designs}
            <div className="mt-3">{presets}</div>
          </div>
          <div>
            <p className="eyebrow mb-2 text-stone-light">04 · Details</p>
            {options}
          </div>
          {palette}
        </div>
        <div className="border-t border-white/8 p-4">{actions}</div>
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
