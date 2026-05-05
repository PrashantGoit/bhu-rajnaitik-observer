"use client";

import { useEffect, useRef, useState } from "react";
import { getKey, setKey, isStaticBuild } from "@/lib/byok-store";

export function ByokPanel() {
  const [open, setOpenRaw] = useState(false);
  const [key, setKeyValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function setOpen(next: boolean) {
    if (next) setKeyValue(getKey("gemini"));
    setOpenRaw(next);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!isStaticBuild()) return null;

  function save() {
    setKey("gemini", key.trim());
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1500);
  }

  function clear() {
    setKey("gemini", "");
    setKeyValue("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--color-map-border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-ink-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        aria-label="API key settings"
      >
        🔑 Key
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-lg rounded-lg border border-[var(--color-map-border)] bg-[var(--color-bg-base)] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-[var(--color-ink-primary)]">
                Bring your own key
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--color-ink-secondary)]">
              This is the free GitHub Pages build. AI features call Google
              Gemini directly from your browser using a key you provide. The
              key is stored only in this browser&apos;s localStorage and is
              never sent to our servers.
            </p>

            <label className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-secondary)]">
              Google Gemini API key
            </label>
            <div className="flex gap-2">
              <input
                type={reveal ? "text" : "password"}
                value={key}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="AIza…"
                className="flex-1 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-3 py-2 font-mono text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="rounded-md border border-[var(--color-map-border)] px-2 text-xs text-[var(--color-ink-secondary)]"
              >
                {reveal ? "Hide" : "Show"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-display text-sm font-bold text-white hover:bg-[var(--color-highlight)]"
              >
                {savedAt ? "Saved ✓" : "Save key"}
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-md border border-[var(--color-map-border)] px-4 py-2 font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)] hover:text-[var(--color-highlight)]"
              >
                Clear
              </button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)] underline hover:text-[var(--color-accent)]"
              >
                Get free key →
              </a>
            </div>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-secondary)]">
              Free tier: ~60 text rewrites/min · Image gen via gemini-2.5-flash-image
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
