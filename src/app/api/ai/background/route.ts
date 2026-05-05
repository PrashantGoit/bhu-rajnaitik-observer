import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  prompt: z.string().min(3).max(400),
});

const SYSTEM_STYLE =
  "Editorial geopolitical infographic background, dark muted palette dominated by deep navy and slate, subtle dotted texture, abstract cartographic shapes, no text, no logos, no faces, suitable as a background behind bold white headline text, cinematic, high contrast";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { prompt } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  const hasUsableKey = !!apiKey && apiKey.startsWith("sk-") && apiKey.length >= 20;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  if (!hasUsableKey) {
    // Stub: deterministic procedural SVG keyed off prompt hash.
    const id = randomUUID();
    const svg = stubProceduralSvg(prompt);
    await fs.writeFile(path.join(uploadsDir, `${id}.svg`), svg, "utf8");
    return NextResponse.json({ url: `/uploads/${id}.svg`, source: "stub" });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `${prompt}. ${SYSTEM_STYLE}`,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Upstream: ${res.status}`, detail: err.slice(0, 200) },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = data.data?.[0];
    let inputBuf: Buffer;
    if (first?.b64_json) {
      inputBuf = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const r = await fetch(first.url);
      inputBuf = Buffer.from(await r.arrayBuffer());
    } else {
      return NextResponse.json({ error: "Empty image response" }, { status: 502 });
    }

    // Re-encode through Sharp: normalizes format, strips EXIF, fits 1080x1080.
    const outBuf = await sharp(inputBuf)
      .resize(1080, 1080, { fit: "cover" })
      .webp({ quality: 88 })
      .toBuffer();
    const id = randomUUID();
    await fs.writeFile(path.join(uploadsDir, `${id}.webp`), outBuf);
    return NextResponse.json({ url: `/uploads/${id}.webp`, source: "openai" });
  } catch {
    return NextResponse.json({ error: "Failed to reach AI provider" }, { status: 502 });
  }
}

function stubProceduralSvg(prompt: string): string {
  const hash = createHash("sha256").update(prompt).digest();
  const palettes = [
    ["#0B1F3A", "#0B0F14"],
    ["#3A0B17", "#0B0F14"],
    ["#0B3A2E", "#0B0F14"],
    ["#3A2E0B", "#0B0F14"],
    ["#1A0B3A", "#0B0F14"],
    ["#0B2E3A", "#0B0F14"],
  ];
  const p = palettes[hash[0] % palettes.length];
  const cx = 200 + (hash[1] % 680);
  const cy = 200 + (hash[2] % 680);
  const dots: string[] = [];
  for (let i = 0; i < 80; i++) {
    const x = (hash[(i * 2) % hash.length] / 255) * 1080;
    const y = (hash[(i * 2 + 1) % hash.length] / 255) * 1080;
    const r = 1 + (hash[(i * 3) % hash.length] % 3);
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#2A3645" opacity="0.6"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <radialGradient id="g" cx="${(cx / 1080).toFixed(3)}" cy="${(cy / 1080).toFixed(3)}" r="0.8">
      <stop offset="0%" stop-color="${p[0]}"/>
      <stop offset="100%" stop-color="${p[1]}"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  ${dots.join("\n  ")}
</svg>`;
}
