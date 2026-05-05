import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  text: z.string().min(1).max(400),
  kind: z.enum(["headline", "subheadline"]).default("headline"),
});

const SYSTEM_PROMPT = `You are an editor for BHU-RAJNAITIK OBSERVER, a geopolitics infographic studio.
Rewrite the user's input to match the @bhurajnaitik voice: authoritative, neutral, geopolitically literate, terse.
Do NOT invent facts, names, dates, or statistics. Only rephrase what the user has written.
For headlines: ≤ 12 words, sentence case, no clickbait, no exclamation marks, no emoji.
For subheadlines: ≤ 25 words, one sentence, factual tone.
Return ONLY the rewritten text — no preamble, no quotes, no explanation.`;

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

  const { text, kind } = parsed.data;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Stub fallback — deterministic, useful for local dev without billing.
    return NextResponse.json({ original: text, rewritten: stubRewrite(text, kind), source: "stub" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Kind: ${kind}\nText: ${text}` }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Upstream error: ${res.status}`, detail: errText.slice(0, 200) }, { status: 502 });
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const rewritten = data.content?.find((c) => c.type === "text")?.text?.trim();
    if (!rewritten) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
    }
    return NextResponse.json({ original: text, rewritten, source: "anthropic" });
  } catch {
    return NextResponse.json({ error: "Failed to reach AI provider" }, { status: 502 });
  }
}

function stubRewrite(text: string, kind: "headline" | "subheadline"): string {
  // Deterministic transform: trim, single-space, sentence-case, drop trailing punctuation.
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  if (kind === "headline") return sentence;
  return `${sentence}.`;
}
