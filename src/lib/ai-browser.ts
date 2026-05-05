// Direct browser → Google Gemini calls for the static (BYOK) build.
// The user supplies their own key. We never store, log, or transmit it
// to any server other than generativelanguage.googleapis.com.
//
// Endpoints:
//   text:  gemini-2.5-flash:generateContent
//   image: gemini-2.5-flash-image-preview:generateContent (response_modalities=IMAGE)

import { getKey } from "./byok-store";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const REWRITE_SYSTEM = `You are an editorial sub-editor for a geopolitics magazine.
Rewrite the user's headline so it is:
- 6 to 14 words
- punchy, declarative, present tense, no clickbait
- no quotation marks, no trailing period
- preserves all proper nouns, places, numbers exactly
Return ONLY the rewritten headline, nothing else.`;

const BG_STYLE_SUFFIX =
  "Editorial geopolitical infographic background, dark muted palette dominated by deep navy and slate, subtle dotted texture, abstract cartographic shapes, no text, no logos, no faces, suitable as a background behind bold white headline text, cinematic, high contrast.";

interface GeminiTextPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiTextPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
}

export class MissingKeyError extends Error {
  constructor() {
    super("No Gemini API key found. Add one in Settings.");
    this.name = "MissingKeyError";
  }
}

function ensureKey(): string {
  const key = getKey("gemini");
  if (!key) throw new MissingKeyError();
  return key;
}

async function callGemini(
  model: string,
  body: unknown,
): Promise<GeminiResponse> {
  const key = ensureKey();
  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? `Gemini ${res.status}`;
    throw new Error(msg);
  }
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Blocked by safety filter: ${data.promptFeedback.blockReason}`);
  }
  return data;
}

export async function aiRewriteHeadline(text: string): Promise<string> {
  const data = await callGemini("gemini-2.5-flash", {
    systemInstruction: { parts: [{ text: REWRITE_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 80,
    },
  });

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => typeof p.text === "string" && p.text.trim().length > 0);
  if (!textPart?.text) throw new Error("Empty rewrite response");
  return textPart.text.trim().replace(/^["'`]+|["'`.]+$/g, "");
}

export async function aiGenerateBackground(
  prompt: string,
): Promise<{ url: string; source: "gemini" }> {
  const fullPrompt = `${prompt}. ${BG_STYLE_SUFFIX}`;
  const data = await callGemini("gemini-2.5-flash-image-preview", {
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  });

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      const mime =
        ("mimeType" in inline && inline.mimeType) ||
        ("mime_type" in inline && inline.mime_type) ||
        "image/png";
      return { url: `data:${mime};base64,${inline.data}`, source: "gemini" };
    }
  }
  throw new Error("No image returned by Gemini");
}

/** Convert a user-uploaded File to a data URL — no server round-trip. */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
