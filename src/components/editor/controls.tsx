"use client";

import { useState } from "react";
import type { Post } from "@/lib/post-schema";
import { BackgroundPicker } from "./background-picker";

interface Props {
  post: Post;
  onChange: (next: Post) => void;
  onExport: () => void;
  exporting: boolean;
}

export function Controls({ post, onChange, onExport, exporting }: Props) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function rewriteHeadline() {
    if (!post.headline.trim()) {
      setAiError("Type a headline first.");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post.headline, kind: "headline" }),
      });
      const data = (await res.json()) as { rewritten?: string; error?: string };
      if (!res.ok || !data.rewritten) {
        setAiError(data.error ?? "AI rewrite failed.");
        return;
      }
      onChange({ ...post, headline: data.rewritten });
    } catch {
      setAiError("Network error.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackgroundPicker value={post.background} onChange={(bg) => onChange({ ...post, background: bg })} />

      <Field label="Headline" required>
        <textarea
          rows={3}
          maxLength={120}
          value={post.headline}
          onChange={(e) => onChange({ ...post, headline: e.target.value })}
          placeholder="Iran strikes Israeli air base"
          className={inputCls}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
            {post.headline.length}/120
          </span>
          <button
            type="button"
            onClick={rewriteHeadline}
            disabled={aiBusy}
            className="rounded border border-[var(--color-map-border)] px-3 py-1 text-xs text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            {aiBusy ? "Rewriting…" : "✨ AI rewrite"}
          </button>
        </div>
        {aiError ? <p className="mt-1 text-xs text-[var(--color-highlight)]">{aiError}</p> : null}
      </Field>

      <Field label="Sub-headline">
        <textarea
          rows={2}
          maxLength={200}
          value={post.subheadline}
          onChange={(e) => onChange({ ...post, subheadline: e.target.value })}
          placeholder="Tehran's deterrence calculus shifts as ballistic missile salvos target Negev base."
          className={inputCls}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          {post.subheadline.length}/200
        </span>
      </Field>

      <Field label="Country / region (optional)">
        <input
          type="text"
          maxLength={48}
          value={post.countryName ?? ""}
          onChange={(e) => onChange({ ...post, countryName: e.target.value || null })}
          placeholder="Iran"
          className={inputCls}
        />
      </Field>

      <button
        type="button"
        onClick={onExport}
        disabled={exporting || !post.headline.trim()}
        className="flex w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-6 py-4 font-display text-base font-bold tracking-tight text-white transition-colors hover:bg-[var(--color-highlight)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? "Rendering 1080×1080…" : "Export PNG ↓"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full resize-none rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-3 py-2 text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-secondary)]">
        {label}
        {required ? <span className="ml-1 text-[var(--color-accent)]">*</span> : null}
      </label>
      {children}
    </div>
  );
}
