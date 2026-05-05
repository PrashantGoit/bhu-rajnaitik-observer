// Browser-side painter — mirrors src/app/api/render/route.ts but uses the
// platform <canvas> API instead of @napi-rs/canvas. Used by the static
// GitHub Pages BYOK build where there is no Node runtime.

import { computeLayout, type DrawCmd } from "./render";
import type { Post } from "./post-schema";
import { basePath } from "./byok-store";

type Ctx2D = CanvasRenderingContext2D;

export async function renderPostToBlob(
  post: Post,
  withWatermark: boolean,
): Promise<Blob> {
  const layout = computeLayout(post, withWatermark);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Best-effort: wait for the @fontsource fonts (already loaded by /editor)
  if ("fonts" in document) {
    try {
      await Promise.all([
        document.fonts.load('800 100px "Inter Tight"'),
        document.fonts.load('500 60px "Inter"'),
        document.fonts.load('600 60px "JetBrains Mono"'),
      ]);
    } catch {
      // continue with fallback fonts
    }
  }

  for (const cmd of layout.commands) {
    await draw(ctx, cmd);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png",
    );
  });
}

async function draw(ctx: Ctx2D, cmd: DrawCmd): Promise<void> {
  if (cmd.kind === "rect" || cmd.kind === "highlight-bar") {
    ctx.save();
    ctx.globalAlpha =
      "opacity" in cmd && cmd.opacity !== undefined ? cmd.opacity : 1;
    ctx.fillStyle = cmd.fill;
    ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
    ctx.restore();
    return;
  }

  if (cmd.kind === "image") {
    try {
      const img = await loadImage(resolveSrc(cmd.src));
      ctx.save();
      ctx.globalAlpha = cmd.opacity ?? 1;
      ctx.drawImage(img, cmd.x, cmd.y, cmd.w, cmd.h);
      ctx.restore();
    } catch {
      // base rect already painted underneath
    }
    return;
  }

  if (cmd.kind === "text-block") {
    drawTextBlock(ctx, cmd);
    return;
  }

  // single-fill text
  ctx.save();
  ctx.fillStyle = cmd.fill;
  ctx.font = `${cmd.fontWeight} ${cmd.fontSize}px ${mapFontFamily(cmd.fontFamily)}`;
  ctx.textAlign = cmd.align;
  ctx.textBaseline = "top";
  const text = cmd.uppercase ? cmd.text.toUpperCase() : cmd.text;
  const lines = wrapText(ctx, text, cmd.w);
  const lineHeightPx = cmd.fontSize * cmd.lineHeight;
  let drawX = cmd.x;
  if (cmd.align === "center") drawX = cmd.x + cmd.w / 2;
  else if (cmd.align === "right") drawX = cmd.x + cmd.w;
  for (let i = 0; i < lines.length; i++) {
    drawTextWithSpacing(
      ctx,
      lines[i],
      drawX,
      cmd.y + i * lineHeightPx,
      cmd.letterSpacing ?? 0,
      cmd.align,
    );
  }
  ctx.restore();
}

function resolveSrc(src: string): string {
  // Prepend basePath for absolute public paths in the static build.
  if (src.startsWith("/") && !src.startsWith("//")) {
    const bp = basePath();
    if (bp && !src.startsWith(bp)) return `${bp}${src}`;
  }
  return src;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function mapFontFamily(name: string): string {
  if (name === "JetBrains Mono")
    return '"JetBrains Mono", "Cascadia Mono", "Consolas", monospace';
  if (name === "Inter Tight")
    return '"Inter Tight", "Inter", "Segoe UI", system-ui, sans-serif';
  return '"Inter", "Segoe UI", system-ui, sans-serif';
}

function wrapText(ctx: Ctx2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width > maxWidth) {
        out.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

function drawTextWithSpacing(
  ctx: Ctx2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  align: "left" | "center" | "right",
): void {
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }
  const widths = Array.from(text).map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) +
    letterSpacing * Math.max(0, text.length - 1);
  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  else if (align === "right") cursor = x - total;
  ctx.textAlign = "left";
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor, y);
    cursor += widths[i] + letterSpacing;
  }
}

function drawTextBlock(
  ctx: Ctx2D,
  cmd: Extract<DrawCmd, { kind: "text-block" }>,
): void {
  ctx.save();
  ctx.textBaseline = "top";
  for (let i = 0; i < cmd.lines.length; i++) {
    const line = cmd.lines[i];
    const y = cmd.y + i * line.fontSize * cmd.lineHeight;
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${mapFontFamily(line.fontFamily)}`;
    const ls = line.letterSpacing;
    const segWidths = line.segments.map((s) => {
      const text = line.uppercase ? s.text.toUpperCase() : s.text;
      const chars = Array.from(text);
      const w = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0);
      return w + ls * Math.max(0, chars.length - 1);
    });
    const totalW =
      segWidths.reduce((a, b) => a + b, 0) +
      ls * Math.max(0, line.segments.length - 1);
    let cursor = cmd.x;
    if (line.align === "center") cursor = cmd.x + (cmd.w - totalW) / 2;
    else if (line.align === "right") cursor = cmd.x + cmd.w - totalW;
    ctx.textAlign = "left";
    for (let s = 0; s < line.segments.length; s++) {
      const seg = line.segments[s];
      const text = line.uppercase ? seg.text.toUpperCase() : seg.text;
      ctx.fillStyle = seg.fill;
      const chars = Array.from(text);
      for (const ch of chars) {
        ctx.fillText(ch, cursor, y);
        cursor += ctx.measureText(ch).width + ls;
      }
      cursor -= ls;
      if (s < line.segments.length - 1) cursor += ls;
    }
  }
  ctx.restore();
}
