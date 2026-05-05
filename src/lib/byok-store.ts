// Browser-only key + draft storage for the static (BYOK) build.
// All keys live in localStorage and never leave the user's browser.

export type Provider = "gemini";

const KEY_PREFIX = "bro:apikey:";
const POST_KEY = "bro:draft-post";

function safeWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

export function getKey(provider: Provider): string {
  const w = safeWindow();
  if (!w) return "";
  return w.localStorage.getItem(KEY_PREFIX + provider) ?? "";
}

export function setKey(provider: Provider, value: string): void {
  const w = safeWindow();
  if (!w) return;
  if (value) w.localStorage.setItem(KEY_PREFIX + provider, value);
  else w.localStorage.removeItem(KEY_PREFIX + provider);
}

export function clearAllKeys(): void {
  const w = safeWindow();
  if (!w) return;
  Object.keys(w.localStorage)
    .filter((k) => k.startsWith(KEY_PREFIX))
    .forEach((k) => w.localStorage.removeItem(k));
}

export function loadDraftPost<T>(): T | null {
  const w = safeWindow();
  if (!w) return null;
  const raw = w.localStorage.getItem(POST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraftPost<T>(post: T): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(POST_KEY, JSON.stringify(post));
  } catch {
    // quota exceeded — silently drop, draft is best-effort
  }
}

export function isStaticBuild(): boolean {
  return process.env.NEXT_PUBLIC_STATIC === "1";
}

export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
