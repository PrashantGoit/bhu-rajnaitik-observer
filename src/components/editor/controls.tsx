"use client";

import { useState } from "react";
import type { Post, TagKind } from "@/lib/post-schema";
import {
  FORMAT_OPTIONS,
  LAYOUT_OPTIONS,
  TAG_OPTIONS,
  FONT_STYLE_OPTIONS,
} from "@/lib/post-schema";
import { BackgroundPicker } from "./background-picker";
import { rewriteHeadline as rewriteHeadlineApi } from "@/lib/api-client";

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
      const rewritten = await rewriteHeadlineApi(post.headline);
      onChange({ ...post, headline: rewritten });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI rewrite failed.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackgroundPicker
        value={post.background}
        onChange={(bg) => onChange({ ...post, background: bg })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Format">
          <select
            value={post.format}
            onChange={(e) => onChange({ ...post, format: e.target.value as Post["format"] })}
            className={selectCls}
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.kind} value={f.kind}>
                {f.name} — {f.kind}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Layout">
          <select
            value={post.layout}
            onChange={(e) => onChange({ ...post, layout: e.target.value as Post["layout"] })}
            className={selectCls}
          >
            {LAYOUT_OPTIONS.map((l) => (
              <option key={l.kind} value={l.kind}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tag">
          <select
            value={post.tag.kind}
            onChange={(e) =>
              onChange({ ...post, tag: { ...post.tag, kind: e.target.value as TagKind } })
            }
            className={selectCls}
          >
            {TAG_OPTIONS.map((t) => (
              <option key={t.kind} value={t.kind}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Font style">
          <select
            value={post.fontStyle}
            onChange={(e) => onChange({ ...post, fontStyle: e.target.value as Post["fontStyle"] })}
            className={selectCls}
          >
            {FONT_STYLE_OPTIONS.map((f) => (
              <option key={f.kind} value={f.kind}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {post.tag.kind === "custom" ? (
        <Field label="Custom tag label">
          <input
            type="text"
            maxLength={28}
            value={post.tag.customLabel ?? ""}
            onChange={(e) => onChange({ ...post, tag: { ...post.tag, customLabel: e.target.value } })}
            placeholder="EXCLUSIVE"
            className={inputCls}
          />
        </Field>
      ) : null}

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

      <Field label="Highlight words (red)">
        <input
          type="text"
          value={post.highlightWords.join(", ")}
          onChange={(e) =>
            onChange({
              ...post,
              highlightWords: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 8),
            })
          }
          placeholder="Iran, strike, sanctions"
          className={inputCls}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          comma-separated · matched as whole words · up to 8
        </span>
      </Field>

      <Field label="Hashtags">
        <input
          type="text"
          value={post.hashtags.join(", ")}
          onChange={(e) =>
            onChange({
              ...post,
              hashtags: e.target.value
                .split(",")
                .map((s) => s.replace(/^#+/, "").trim())
                .filter(Boolean)
                .slice(0, 8),
            })
          }
          placeholder="geopolitics, breaking, iran"
          className={inputCls}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          comma-separated · # added automatically · up to 8
        </span>
      </Field>

      {post.layout === "stat" ? (
        <div className="grid grid-cols-2 gap-3 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/20 p-3">
          <Field label="Stat value">
            <input
              type="text"
              maxLength={16}
              value={post.stat?.value ?? ""}
              onChange={(e) =>
                onChange({
                  ...post,
                  stat: { value: e.target.value, label: post.stat?.label ?? "" },
                })
              }
              placeholder="78%"
              className={inputCls}
            />
          </Field>
          <Field label="Stat label">
            <input
              type="text"
              maxLength={80}
              value={post.stat?.label ?? ""}
              onChange={(e) =>
                onChange({
                  ...post,
                  stat: { value: post.stat?.value ?? "", label: e.target.value },
                })
              }
              placeholder="approval drop"
              className={inputCls}
            />
          </Field>
        </div>
      ) : null}

      {post.layout === "quote" ? (
        <Field label="Attribution">
          <input
            type="text"
            maxLength={80}
            value={post.attribution ?? ""}
            onChange={(e) => onChange({ ...post, attribution: e.target.value })}
            placeholder="— Senior official, foreign ministry"
            className={inputCls}
          />
        </Field>
      ) : null}

      <button
        type="button"
        onClick={onExport}
        disabled={exporting || !post.headline.trim()}
        className="flex w-full items-center justify-center rounded-md bg-[var(--color-accent)] px-6 py-4 font-display text-base font-bold tracking-tight text-white transition-colors hover:bg-[var(--color-highlight)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? "Rendering…" : "Export PNG ↓"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full resize-none rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-3 py-2 text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30";

const selectCls =
  "w-full rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-2 py-2 text-sm text-[var(--color-ink-primary)] focus:border-[var(--color-accent)] focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
