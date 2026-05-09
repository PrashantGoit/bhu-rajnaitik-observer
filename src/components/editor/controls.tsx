"use client";

import { useState } from "react";
import type { Post, TagKind } from "@/lib/post-schema";
import {
  FORMAT_OPTIONS,
  LAYOUT_OPTIONS,
  TAG_OPTIONS,
  FONT_STYLE_OPTIONS,
  FONT_SCALE_OPTIONS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_PRESETS,
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

        <Field label="Style preset">
          <SegmentedControl
            options={FONT_STYLE_OPTIONS.map((f) => ({ value: f.kind, label: f.name, title: f.description }))}
            value={post.fontStyle}
            onChange={(v) => onChange({ ...post, fontStyle: v as Post["fontStyle"] })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Headline font">
            <FontFamilyPicker
              value={post.headlineFont}
              onChange={(v) => onChange({ ...post, headlineFont: v })}
            />
          </Field>
        </div>
        <Field label="Size (px)">
          <FontSizePicker
            value={post.headlineSize}
            onChange={(n) => onChange({ ...post, headlineSize: n })}
          />
        </Field>
      </div>

      <Field label="Auto size preset (when Size = Auto)">
        <SegmentedControl
          options={FONT_SCALE_OPTIONS.map((s) => ({ value: s.kind, label: s.label, title: s.description }))}
          value={post.fontScale}
          onChange={(v) => onChange({ ...post, fontScale: v as Post["fontScale"] })}
        />
      </Field>

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
          rows={4}
          maxLength={280}
          value={post.headline}
          onChange={(e) => onChange({ ...post, headline: e.target.value })}
          placeholder="Iran strikes Israeli air base"
          className={inputCls}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
            {post.headline.length}/280
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
          rows={4}
          maxLength={600}
          value={post.subheadline}
          onChange={(e) => onChange({ ...post, subheadline: e.target.value })}
          placeholder="Tehran's deterrence calculus shifts as ballistic missile salvos target Negev base."
          className={inputCls}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          {post.subheadline.length}/600
        </span>
      </Field>

      <Field label="Sub-headline size (px)">
        <FontSizePicker
          value={post.subheadlineSize}
          onChange={(n) => onChange({ ...post, subheadlineSize: n })}
          maxPx={120}
          defaultAuto={28}
          listId="bro-sub-font-sizes"
        />
      </Field>

      <Field label="Sub-headline highlight words (red)">
        <HighlightTagInput
          value={post.subHighlightWords}
          onChange={(words) => onChange({ ...post, subHighlightWords: words })}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          Press Enter or comma to add. Backspace to remove. Up to 12.
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

      <Field label="Headline highlight words (red)">
        <HighlightTagInput
          value={post.highlightWords}
          onChange={(words) => onChange({ ...post, highlightWords: words })}
        />
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-secondary)]">
          Press Enter or comma to add. Backspace to remove. Up to 8.
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

const MAX_HIGHLIGHTS = 8;

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; title?: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={
              "flex-1 rounded px-2 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors " +
              (active
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word-style font family picker — grouped <select> where each option
// previews itself in its own font. Server-rendered fonts that aren't
// loaded fall back to system equivalents (acceptable for MVP).
// ---------------------------------------------------------------------------
function FontFamilyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const groups: Record<string, typeof FONT_FAMILY_OPTIONS> = {
    Sans: [],
    Display: [],
    Serif: [],
    Mono: [],
  };
  for (const f of FONT_FAMILY_OPTIONS) {
    const cap = f.category.charAt(0).toUpperCase() + f.category.slice(1);
    if (!groups[cap]) groups[cap] = [];
    groups[cap].push(f);
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-3 py-2 text-sm text-[var(--color-ink-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      style={{ fontFamily: `"${value}", system-ui, sans-serif` }}
    >
      {Object.entries(groups).map(([label, list]) =>
        list.length === 0 ? null : (
          <optgroup key={label} label={label}>
            {list.map((f) => (
              <option
                key={f.family}
                value={f.family}
                style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}
              >
                {f.family}
                {f.description ? ` — ${f.description}` : ""}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Word-style numeric size picker. 0 = Auto. Combobox: type a number, or
// pick from common preset sizes. Up/down arrows step by 4px.
// ---------------------------------------------------------------------------
function FontSizePicker({
  value,
  onChange,
  maxPx = 280,
  defaultAuto = 96,
  listId = "bro-font-sizes",
}: {
  value: number;
  onChange: (next: number) => void;
  maxPx?: number;
  defaultAuto?: number;
  listId?: string;
}) {
  const [draft, setDraft] = useState<string>(value > 0 ? String(value) : "");

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(0);
      setDraft("");
      return;
    }
    const n = Math.round(Number(trimmed));
    if (!Number.isFinite(n) || n <= 0) {
      onChange(0);
      setDraft("");
      return;
    }
    const clamped = Math.max(8, Math.min(maxPx, n));
    onChange(clamped);
    setDraft(String(clamped));
  }

  function bump(delta: number) {
    const current = value > 0 ? value : defaultAuto;
    const next = Math.max(8, Math.min(maxPx, current + delta));
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div className="flex items-stretch gap-1">
      <div className="relative flex-1">
        <input
          type="text"
          inputMode="numeric"
          list={listId}
          value={draft}
          placeholder="Auto"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              bump(4);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              bump(-4);
            }
          }}
          className="w-full rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-3 py-2 text-sm text-[var(--color-ink-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
        <datalist id={listId}>
          {FONT_SIZE_PRESETS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => bump(4)}
          aria-label="Increase size"
          className="flex-1 rounded-t border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-2 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => bump(-4)}
          aria-label="Decrease size"
          className="flex-1 rounded-b border-x border-b border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 px-2 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function HighlightTagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [buffer, setBuffer] = useState("");

  function commit(raw: string) {
    const next = raw.trim().replace(/\s+/g, " ");
    if (!next) return;
    if (value.length >= MAX_HIGHLIGHTS) return;
    if (value.some((v) => v.toLowerCase() === next.toLowerCase())) return;
    onChange([...value, next].slice(0, MAX_HIGHLIGHTS));
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(buffer);
      setBuffer("");
    } else if (e.key === "Backspace" && buffer === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    // Auto-commit on comma anywhere in pasted/typed text
    if (text.includes(",")) {
      const parts = text.split(",");
      for (let i = 0; i < parts.length - 1; i++) commit(parts[i]);
      setBuffer(parts[parts.length - 1].trimStart());
    } else {
      setBuffer(text);
    }
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const full = value.length >= MAX_HIGHLIGHTS;

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40 p-1.5 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30">
      {value.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-flex items-center gap-1 rounded bg-[var(--color-accent)] px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-white"
        >
          {word}
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove ${word}`}
            className="rounded text-white/80 hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={buffer}
        onChange={handleChange}
        onKeyDown={handleKey}
        onBlur={() => {
          if (buffer.trim()) {
            commit(buffer);
            setBuffer("");
          }
        }}
        placeholder={
          full
            ? "Max 8 reached"
            : value.length === 0
              ? "Iran, strikes, white house…"
              : "Add another…"
        }
        disabled={full}
        className="flex-1 min-w-[120px] bg-transparent px-1.5 py-1 text-sm text-[var(--color-ink-primary)] placeholder:text-[var(--color-ink-secondary)]/60 focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}
