"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Post } from "@/lib/post-schema";
import { Controls } from "@/components/editor/controls";
import { exportPng } from "@/lib/api-client";
import { loadDraftPost, saveDraftPost, isStaticBuild } from "@/lib/byok-store";

const CanvasPreview = dynamic(
  () => import("@/components/editor/canvas-preview").then((m) => m.CanvasPreview),
  { ssr: false, loading: () => <PreviewSkeleton /> },
);

const INITIAL_POST: Post = {
  background: { kind: "preset", slug: "world-dark" },
  headline: "Iran strikes Israeli air base",
  subheadline:
    "Tehran's deterrence calculus shifts as ballistic missile salvos target Negev base.",
  countryName: "Iran",
  highlightWords: ["Iran", "strikes"],
  hashtags: ["geopolitics", "breaking"],
  format: "1080x1080",
  layout: "centered",
  tag: { kind: "breaking" },
  fontStyle: "display",
};

export default function EditorPage() {
  const [post, setPost] = useState<Post>(() => {
    if (typeof window === "undefined") return INITIAL_POST;
    return loadDraftPost<Post>() ?? INITIAL_POST;
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState(560);

  useEffect(() => {
    function update() {
      const w = Math.min(640, Math.max(320, window.innerWidth - 480));
      setPreviewWidth(w);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Persist draft to localStorage in static build (debounced).
  useEffect(() => {
    if (!isStaticBuild()) return;
    const t = setTimeout(() => saveDraftPost(post), 400);
    return () => clearTimeout(t);
  }, [post]);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportPng(post);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bhurajnaitik-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-8 lg:flex-row lg:gap-10 lg:px-10">
      <header className="mb-6 flex items-center justify-between lg:hidden">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Editor</h1>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)]"
        >
          ← Home
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center lg:items-start">
        <div className="mb-4 hidden items-center gap-4 lg:flex">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]"
          >
            ← Home
          </Link>
          <span className="text-[var(--color-map-border)]">/</span>
          <h1 className="font-display text-xl font-extrabold tracking-tight">Editor</h1>
        </div>
        <CanvasPreview post={post} displayWidth={previewWidth} />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-secondary)]">
          Live preview · {post.format} · watermark added on export
        </p>
        {exportError ? (
          <p className="mt-3 text-sm text-[var(--color-highlight)]" role="status">
            {exportError}
          </p>
        ) : null}
      </section>

      <aside className="mt-10 w-full max-w-md lg:mt-0">
        <Controls post={post} onChange={setPost} onExport={handleExport} exporting={exporting} />
      </aside>
    </main>
  );
}

function PreviewSkeleton() {
  return (
    <div className="aspect-square w-[560px] max-w-full animate-pulse rounded-md border border-[var(--color-map-border)] bg-[var(--color-map-land)]/40" />
  );
}
