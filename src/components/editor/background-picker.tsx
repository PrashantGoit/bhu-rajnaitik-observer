"use client";

import { useState } from "react";
import type { Background } from "@/lib/post-schema";
import { PRESET_BACKGROUNDS } from "@/lib/post-schema";
import { uploadImage, generateBackground } from "@/lib/api-client";
import { isStaticBuild, basePath } from "@/lib/byok-store";

interface Props {
  value: Background;
  onChange: (bg: Background) => void;
}

export function BackgroundPicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange({ kind: "upload", src: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) {
      setAiNote("Type a prompt first.");
      return;
    }
    setAiBusy(true);
    setAiNote(null);
    try {
      const url = await generateBackground(aiPrompt);
      onChange({ kind: "upload", src: url });
      setAiNote(isStaticBuild() ? "Generated via Gemini." : "Generated.");
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-secondary)]">
        Background
      </label>

      <div className="grid grid-cols-2 gap-2">
        {PRESET_BACKGROUNDS.map((p) => {
          const active = value.kind === "preset" && value.slug === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => onChange({ kind: "preset", slug: p.slug })}
              className={`group relative aspect-square overflow-hidden rounded-md border transition-colors ${
                active
                  ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40"
                  : "border-[var(--color-map-border)] hover:border-[var(--color-ink-secondary)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${basePath()}/backgrounds/${p.slug}.svg`} alt={p.name} className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-primary)]">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--color-map-border)] bg-[var(--color-map-land)]/30 px-4 py-3 text-sm text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-secondary)]">
          <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} disabled={uploading} />
          {uploading ? "Uploading…" : "Upload custom (≤5 MB)"}
        </label>
        {error ? <p className="text-xs text-[var(--color-highlight)]">{error}</p> : null}
      </div>

      <div className="space-y-2 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/20 p-3">
        <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-secondary)]">
          ✨ Generate background with AI
        </label>
        <textarea
          rows={2}
          maxLength={400}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="middle-east desert military operation at dusk"
          className="w-full resize-none rounded border border-[var(--color-map-border)] bg-[var(--color-bg-base)] px-2 py-1.5 text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAiGenerate}
          disabled={aiBusy}
          className="w-full rounded border border-[var(--color-accent)] px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-50"
        >
          {aiBusy ? "Generating…" : "Generate"}
        </button>
        {aiNote ? <p className="text-xs text-[var(--color-ink-secondary)]">{aiNote}</p> : null}
      </div>

      {value.kind === "upload" ? (
        <p className="truncate font-mono text-xs text-[var(--color-ink-secondary)]">✓ Active: {value.src}</p>
      ) : null}
    </div>
  );
}
