"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { asset, IS_STATIC } from "@/lib/asset";
import { useSampleBox } from "@/lib/store/sampleBox";
import { showroomStatus } from "@/lib/hours";
import { showroomById, type CityId } from "@/lib/site";
import { finishById } from "@/data/catalogue";
import { answerLocally, cardsFromText, chipRoute, STARTERS, type Card, type Reply } from "@/lib/concierge/brain";

interface Msg {
  role: "user" | "assistant";
  content: string;
  cards?: Card[];
  chips?: string[];
}

const STORE = "unipanel-concierge";

// ---------------------------------------------------------------- icons
const I = {
  mic: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  ),
  // a speech bubble with typing dots: reads as "chat" at a glance
  bubble: (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
      <path d="M6 8.5C6 6.6 7.6 5 9.5 5h13C24.4 5 26 6.6 26 8.5v9c0 1.9-1.6 3.5-3.5 3.5H15l-5.2 4.3c-.6.5-1.5.1-1.5-.7V21h0A3.3 3.3 0 0 1 6 17.7z" fill="#e4c020" />
      <circle cx="11.5" cy="13" r="1.6" fill="#0f0f0e" className="cg-dot" />
      <circle cx="16" cy="13" r="1.6" fill="#0f0f0e" className="cg-dot" style={{ animationDelay: "160ms" }} />
      <circle cx="20.5" cy="13" r="1.6" fill="#0f0f0e" className="cg-dot" style={{ animationDelay: "320ms" }} />
    </svg>
  ),
};

function Dots() {
  return (
    <span className="inline-flex gap-1 rounded-2xl rounded-tl-md bg-white/[0.05] px-4 py-3.5">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-champagne" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function Avatar() {
  return <img src={asset("/brand/LOGO-Black-circle.png")} alt="" className="mt-0.5 h-7 w-7 shrink-0 scale-125 rounded-full" />;
}

function FinishCard({ id, onAct }: { id: string; onAct: (name: string, input: Record<string, unknown>) => void }) {
  const f = finishById(id);
  const inBox = useSampleBox((s) => s.ids.includes(id));
  if (!f) return null;
  return (
    <div className="w-[168px] shrink-0 snap-start overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10">
      <Link href={`/finishes/${f.id}/`} className="block aspect-[4/3] overflow-hidden" style={{ background: f.hex }}>
        <img src={f.textures.swatch} alt="" loading="lazy" className="h-full w-full object-cover" />
      </Link>
      <div className="p-2.5">
        <p className="truncate text-[13px] text-porcelain">{f.name}</p>
        <p className="truncate font-mono text-[13px] text-champagne">{f.code ?? f.category}</p>
        <div className="mt-2 flex gap-1">
          <button onClick={() => onAct("apply_finish", { zone: "allDoors", finishId: f.id })} className="h-8 flex-1 rounded-full bg-porcelain text-[13px] text-ink">
            Studio
          </button>
          <button
            onClick={() => onAct("add_to_sample_box", { ids: [f.id] })}
            disabled={inBox}
            className="h-8 rounded-full px-2.5 text-[13px] text-porcelain ring-1 ring-white/20 disabled:opacity-50"
            aria-label={inBox ? `${f.name} is in your Sample Box` : `Add ${f.name} to Sample Box`}
          >
            {inBox ? "✓" : "+ Sample"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShowroomCard({ id }: { id: CityId }) {
  const s = showroomById(id);
  const st = showroomStatus(s);
  return (
    <div className="w-[220px] shrink-0 snap-start rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
      <p className="display text-[22px] text-porcelain">{s.city}</p>
      <p className="mt-1 flex items-center gap-2 text-[13px] text-porcelain/80">
        <span className={`h-2 w-2 rounded-full ${st.open ? "bg-[#7fb38a]" : "bg-stone"}`} />
        {st.label}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-stone-light">
        {s.street}, {s.suburb}
      </p>
      <div className="mt-3 flex gap-1">
        <a href={s.phoneHref} className="h-8 flex-1 rounded-full bg-porcelain text-center text-[13px] leading-8 text-ink">
          Call
        </a>
        <a href={s.mapsUrl} target="_blank" rel="noopener" className="h-8 flex-1 rounded-full text-center text-[13px] leading-8 text-porcelain ring-1 ring-white/20">
          Directions
        </a>
      </div>
    </div>
  );
}

function LinkCard({ c }: { c: Extract<Card, { type: "link" }> }) {
  const cls = "flex min-h-[64px] w-[200px] shrink-0 snap-start flex-col justify-center rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10 transition-colors hover:ring-champagne/60";
  const inner = (
    <>
      <span className="text-[14px] text-porcelain">{c.label} →</span>
      {c.note && <span className="text-[13px] text-stone-light">{c.note}</span>}
    </>
  );
  return c.download ? (
    <a href={asset(c.href)} download className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={c.href} className={cls}>
      {inner}
    </Link>
  );
}

export function Concierge() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const list = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const addSamples = useSampleBox((s) => s.add);

  // remember the conversation while browsing between pages
  useEffect(() => {
    setVoice("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "[]");
      if (Array.isArray(saved)) setMsgs(saved);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = open && window.innerWidth < 640 ? "hidden" : "";
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const act = (name: string, inp: Record<string, unknown>) => {
    if (name === "apply_finish" || name === "set_scene") {
      if (path?.startsWith("/studio")) window.dispatchEvent(new CustomEvent("unipanel:studio", { detail: { name, input: inp } }));
      else {
        try {
          const q = JSON.parse(sessionStorage.getItem("unipanel-pending") || "[]");
          q.push({ name, input: inp });
          sessionStorage.setItem("unipanel-pending", JSON.stringify(q));
        } catch {
          /* ignore */
        }
        router.push("/studio/");
      }
    }
    if (name === "open_finish_page" && finishById(String(inp.id))) router.push(`/finishes/${inp.id}/`);
    if (name === "add_to_sample_box") addSamples((inp.ids as string[]) ?? []);
    if (name === "book_showroom_visit") router.push(`/showrooms/?book=${inp.city ?? "jhb"}${inp.date ? `&date=${encodeURIComponent(String(inp.date))}` : ""}${inp.note ? `&note=${encodeURIComponent(String(inp.note))}` : ""}#book`);
    if (name === "start_enquiry") router.push(`/contact/?city=${inp.city ?? "jhb"}&message=${encodeURIComponent(String(inp.summary ?? ""))}`);
  };

  /** finishes discussed most recently, for follow-ups like "add these" */
  const context = () => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const ids = (msgs[i].cards ?? []).filter((c): c is { type: "finish"; id: string } => c.type === "finish").map((c) => c.id);
      if (ids.length) return ids;
    }
    return [];
  };

  const local = (q: string, ctx: string[]): Reply => {
    const r = answerLocally(q, ctx);
    (r.actions ?? []).forEach((a) => act(a.name, a.input));
    return r;
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const route = chipRoute(q);
    if (route) {
      setMsgs((m) => [...m, { role: "user", content: q }]);
      router.push(route);
      return;
    }
    const ctx = context();
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setInput("");
    setBusy(true);

    if (IS_STATIC) {
      // instant, on-device answers in the static build
      setMsgs(next);
      await new Promise((r) => setTimeout(r, 380));
      const r = local(q, ctx);
      setMsgs([...next, { role: "assistant", content: r.text, cards: r.cards, chips: r.chips }]);
      setBusy(false);
      return;
    }

    setMsgs([...next, { role: "assistant", content: "" }]);
    const write = (s: string) =>
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + s };
        return c;
      });
    const fallback = () => {
      const r = local(q, ctx);
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: r.text, cards: r.cards, chips: r.chips };
        return c;
      });
    };
    try {
      const res = await fetch(asset("/api/concierge/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), context: `Visitor is on ${path}` }),
      });
      if (!res.ok || !res.body) return fallback();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let errored = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; delta?: string; name?: string; input?: Record<string, unknown> };
          if (ev.type === "text" && ev.delta) write(ev.delta);
          if (ev.type === "action" && ev.name) act(ev.name, ev.input ?? {});
          if (ev.type === "error") errored = true;
        }
      }
      if (errored) fallback();
      // show cards for any finish the AI mentioned
      else
        setMsgs((m) => {
          const c = [...m];
          const last = c[c.length - 1];
          c[c.length - 1] = { ...last, cards: cardsFromText(last.content) };
          return c;
        });
    } catch {
      fallback();
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const R = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.lang = "en-ZA";
    r.interimResults = false;
    r.onresult = (e) => send(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const lastAssistant = msgs.reduce((acc, m, i) => (m.role === "assistant" ? i : acc), -1);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="concierge"
        aria-label="Ask Unipanel, open the concierge chat"
        className={`group fixed z-[55] flex h-14 items-center gap-3 rounded-full bg-ink p-1.5 text-[14px] text-porcelain shadow-[0_14px_40px_rgba(0,0,0,.35)] ring-1 ring-white/12 transition-[transform,opacity,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,.45)] sm:pr-5 ${
          path?.startsWith("/studio") ? "bottom-[250px] right-4 lg:bottom-5 lg:right-[460px]" : "bottom-5 right-5"
        } ${open ? "pointer-events-none translate-y-4 opacity-0" : ""}`}
      >
        <span className="relative grid h-11 w-11 place-items-center rounded-full bg-[#1d1d1b] ring-1 ring-champagne/40">
          <span className="cg-ring absolute inset-0 rounded-full ring-2 ring-champagne/60" aria-hidden />
          {I.bubble}
        </span>
        <span className="hidden text-[14px] sm:inline">Ask Unipanel</span>
        <style>{`
          .cg-ring{animation:cgring 2.8s cubic-bezier(.22,1,.36,1) infinite}
          @keyframes cgring{0%{transform:scale(1);opacity:.9}70%,100%{transform:scale(1.45);opacity:0}}
          .cg-dot{animation:cgdot 1.4s ease-in-out infinite}
          @keyframes cgdot{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-1px)}}
          @media (prefers-reduced-motion: reduce){.cg-ring,.cg-dot{animation:none}}
        `}</style>
      </button>

      <div
        id="concierge"
        role="dialog"
        aria-modal="false"
        aria-label="Ask Unipanel concierge"
        className={`fixed z-[70] flex flex-col overflow-hidden bg-[#121211] text-porcelain shadow-[0_30px_80px_rgba(0,0,0,.5)] ring-1 ring-white/10 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] max-sm:inset-0 sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100dvh-110px))] sm:w-[420px] sm:rounded-3xl ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3 max-sm:pt-[max(env(safe-area-inset-top),12px)]">
          <img src={asset("/brand/LOGO-Black-circle.png")} alt="" className="h-11 w-11 shrink-0 scale-125 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">Ask Unipanel</p>
            <p className="flex items-center gap-1.5 text-[13px] text-stone-light">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7fb38a]" />
              Concierge · replies instantly
            </p>
          </div>
          {msgs.length > 0 && (
            <button onClick={() => setMsgs([])} className="grid h-10 w-10 place-items-center rounded-full text-stone-light hover:bg-white/10 hover:text-porcelain" aria-label="Start a new conversation" title="New conversation">
              {I.reset}
            </button>
          )}
          <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full text-stone-light hover:bg-white/10 hover:text-porcelain" aria-label="Close concierge" title="Close">
            {I.close}
          </button>
        </div>

        {/* conversation */}
        <div ref={list} className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
          {msgs.length === 0 && (
            <div>
              <p className="display text-[30px] leading-tight">
                Good day. <em className="display-italic text-champagne">How can I help?</em>
              </p>
              <p className="mt-2 text-[15px] text-porcelain/70">Find a finish, restyle the Studio, check a showroom or add samples to your box.</p>
              <div className="mt-5 grid gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="group flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-left text-[14px] text-porcelain/85 ring-1 ring-white/8 transition-colors hover:bg-white/[0.07] hover:text-porcelain">
                    {s}
                    <span className="text-stone-light transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-champagne px-4 py-2.5 text-[15px] leading-relaxed text-ink">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <Avatar />
                <div className="min-w-0 flex-1">
                  {m.content ? <p className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-white/[0.05] px-4 py-2.5 text-[15px] leading-relaxed text-porcelain/90">{m.content}</p> : <Dots />}
                  {m.cards && m.cards.length > 0 && (
                    <div className="no-scrollbar -mr-4 mt-2 flex snap-x gap-2 overflow-x-auto pb-1 pr-4">
                      {m.cards.map((c, k) => (c.type === "finish" ? <FinishCard key={k} id={c.id} onAct={act} /> : c.type === "showroom" ? <ShowroomCard key={k} id={c.id} /> : <LinkCard key={k} c={c} />))}
                    </div>
                  )}
                  {i === lastAssistant && m.chips && m.chips.length > 0 && !busy && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <button key={c} onClick={() => send(c)} className="rounded-full px-3 py-1.5 text-[13px] text-porcelain/85 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-porcelain">
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && IS_STATIC && (
            <div className="flex gap-2.5">
              <Avatar />
              <Dots />
            </div>
          )}
        </div>

        {/* composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-white/8 p-3 pb-[max(env(safe-area-inset-bottom),12px)]"
        >
          <div className="flex items-end gap-1.5 rounded-2xl bg-white/[0.05] p-1.5 ring-1 ring-white/10 focus-within:ring-champagne/70">
            <label htmlFor="concierge-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="concierge-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={listening ? "Listening…" : "Ask about a finish, the Studio or a showroom"}
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] placeholder:text-stone-light focus:outline-none"
            />
            {voice && (
              <button
                type="button"
                onClick={listen}
                aria-label={listening ? "Listening" : "Ask by voice"}
                title="Ask by voice"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${listening ? "animate-pulse bg-champagne text-ink" : "text-stone-light hover:bg-white/10 hover:text-porcelain"}`}
              >
                {I.mic}
              </button>
            )}
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-champagne text-ink transition-opacity disabled:opacity-30">
              {I.send}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onend: () => void;
  start: () => void;
}
