import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

// Lightweight email regex — boundary validation only; not RFC-perfect on purpose.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// MVP storage: append to a local JSONL file. Replace with Supabase before launch.
// AGENTS.md non-negotiable: no secrets in repo, RLS once we move to Supabase.
const STORE_PATH = path.join(process.cwd(), ".data", "waitlist.jsonl");

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string"
    ? ((body as { email: string }).email).trim().toLowerCase()
    : "";

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const record = JSON.stringify({ email, at: new Date().toISOString() });
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.appendFile(STORE_PATH, record + "\n", "utf8");
  } catch {
    // Read-only filesystem (e.g. Vercel) — degrade gracefully so the form
    // still works for the alpha. Replace with Supabase before launch.
    console.log("[waitlist]", record);
  }

  return NextResponse.json({ ok: true });
}
