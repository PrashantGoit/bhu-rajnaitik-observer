// Single entry point for editor → backend calls. Switches between the
// hosted server routes (Vercel) and direct-to-Gemini browser calls
// (static GitHub Pages BYOK build) based on NEXT_PUBLIC_STATIC.

import type { Post } from "./post-schema";
import { isStaticBuild, basePath } from "./byok-store";
import {
  aiGenerateBackground,
  aiRewriteHeadline,
  readFileAsDataURL,
} from "./ai-browser";
import { renderPostToBlob } from "./render-browser";

function withBase(path: string): string {
  // Internal API routes are unavailable in static; this helper is only
  // used in the server build, where basePath() returns "".
  const bp = basePath();
  if (path.startsWith("/") && bp && !path.startsWith(bp)) return `${bp}${path}`;
  return path;
}

export async function rewriteHeadline(text: string): Promise<string> {
  if (isStaticBuild()) return aiRewriteHeadline(text);

  const res = await fetch(withBase("/api/ai/rewrite"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, kind: "headline" }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    rewritten?: string;
    error?: string;
  };
  if (!res.ok || !data.rewritten) {
    throw new Error(data.error ?? `Rewrite failed (${res.status})`);
  }
  return data.rewritten;
}

export async function generateBackground(prompt: string): Promise<string> {
  if (isStaticBuild()) {
    const out = await aiGenerateBackground(prompt);
    return out.url;
  }
  const res = await fetch(withBase("/api/ai/background"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? `Background failed (${res.status})`);
  }
  return data.url;
}

export async function uploadImage(file: File): Promise<string> {
  if (isStaticBuild()) return readFileAsDataURL(file);

  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(withBase("/api/upload"), {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  return data.url;
}

export async function exportPng(post: Post): Promise<Blob> {
  if (isStaticBuild()) return renderPostToBlob(post, true);

  const res = await fetch(withBase("/api/render"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Render failed (${res.status})`);
  }
  return res.blob();
}

export async function joinWaitlist(email: string): Promise<void> {
  if (isStaticBuild()) {
    // No backend on GitHub Pages — store locally + open mailto fallback.
    if (typeof window !== "undefined") {
      try {
        const list = JSON.parse(
          window.localStorage.getItem("bro:waitlist") ?? "[]",
        ) as string[];
        list.push(email);
        window.localStorage.setItem("bro:waitlist", JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    return;
  }
  const res = await fetch(withBase("/api/waitlist"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Waitlist signup failed");
}
