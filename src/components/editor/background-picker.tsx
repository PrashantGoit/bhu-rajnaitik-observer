"use client";

import { useState } from "react";
import type { Background } from "@/lib/post-schema";
import { PRESET_BACKGROUNDS } from "@/lib/post-schema";

interface Props {
  value: Background;
  onChange: (bg: Background) => void;
}

export function BackgroundPicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange({ kind: "upload", src: data.url });
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
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
              <img
                src={`/backgrounds/${p.slug}.svg`}
                alt={p.name}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-primary)]">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--color-map-border)] bg-[var(--color-map-land)]/30 px-4 py-3 text-sm text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-secondary)]">
          <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} disabled={uploading} />
          {uploading ? "Uploading…" : "Upload custom background (≤5 MB)"}
        </label>
        {value.kind === "upload" ? (
          <p className="mt-2 truncate font-mono text-xs text-[var(--color-ink-secondary)]">
            ✓ Using uploaded: {value.src}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-[var(--color-highlight)]">{error}</p> : null}
      </div>
    </div>
  );
}
