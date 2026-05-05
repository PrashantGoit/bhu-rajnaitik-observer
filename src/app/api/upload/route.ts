import { NextResponse } from "next/server";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — AGENTS.md non-negotiable #3
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Re-encode through Sharp: strips EXIF, prevents polyglot files, normalizes format.
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, { failOn: "error" })
      .rotate() // honour EXIF orientation before stripping
      .resize({ width: 2160, height: 2160, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Could not process image" }, { status: 422 });
  }

  const id = randomUUID();
  const filename = `${id}.webp`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), outputBuffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
