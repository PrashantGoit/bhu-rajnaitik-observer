import { NextResponse } from "next/server";
import { createCanvas, loadImage, Image as CanvasImage } from "@napi-rs/canvas";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PostSchema } from "@/lib/post-schema";
import { computeLayout, type DrawCmd } from "@/lib/render";
import { ensureFontsRegistered } from "@/lib/server-fonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  ensureFontsRegistered();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid post payload", issues: parsed.error.format() },
      { status: 400 },
    );
  }
  const post = parsed.data;

  const layout = computeLayout(post, true);
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = canvas.getContext("2d");

  for (const cmd of layout.commands) {
    await draw(ctx, cmd);
  }

  const pngBuffer = await canvas.encode("png");

  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="bhurajnaitik-${Date.now()}.png"`,
      "Cache-Control": "no-store",
    },
  });
}

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

async function draw(ctx: Ctx, cmd: DrawCmd): Promise<void> {
  if (cmd.kind === "rect" || cmd.kind === "highlight-bar") {
    ctx.save();
    ctx.globalAlpha = "opacity" in cmd && cmd.opacity !== undefined ? cmd.opacity : 1;
    ctx.fillStyle = cmd.fill;
    ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
    ctx.restore();
    return;
  }

  if (cmd.kind === "image") {
    try {
      const img = await loadImageForCmd(cmd.src);
      ctx.save();
      ctx.globalAlpha = cmd.opacity ?? 1;
      ctx.drawImage(img, cmd.x, cmd.y, cmd.w, cmd.h);
      ctx.restore();
    } catch {
      // Fail silently — base rect already drawn underneath.
    }
    return;
  }

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
    drawTextWithSpacing(ctx, lines[i], drawX, cmd.y + i * lineHeightPx, cmd.letterSpacing ?? 0, cmd.align);
  }

  ctx.restore();
}

async function loadImageForCmd(src: string): Promise<CanvasImage> {
  if (src.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", src.replace(/^\//, ""));
    const buf = await fs.readFile(filePath);
    return loadImage(buf);
  }
  return loadImage(src);
}

function mapFontFamily(name: string): string {
  if (name === "JetBrains Mono") return '"JetBrains Mono", "Cascadia Mono", "Consolas", monospace';
  if (name === "Inter Tight") return '"Inter Tight", "Inter", "Segoe UI", system-ui, sans-serif';
  return '"Inter", "Segoe UI", system-ui, sans-serif';
}

function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
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
  ctx: Ctx,
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
  const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * Math.max(0, text.length - 1);
  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  else if (align === "right") cursor = x - total;
  ctx.textAlign = "left";
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cursor, y);
    cursor += widths[i] + letterSpacing;
  }
}
