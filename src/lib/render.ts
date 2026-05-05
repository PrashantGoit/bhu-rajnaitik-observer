import type { Post } from "./post-schema";
import { FORMAT_DIMENSIONS } from "./post-schema";

/**
 * Pure layout module — produces an ordered list of draw commands that both
 * the Konva live preview and the server-side @napi-rs/canvas renderer iterate.
 *
 * Rule: NEVER reach into the DOM or `canvas` directly here. Inputs and outputs
 * are plain data so we can unit-test layout independently of any renderer.
 */

export const TOKENS = {
  bgBase: "#0B0F14",
  mapLand: "#1A2330",
  mapBorder: "#2A3645",
  inkPrimary: "#F5F7FA",
  inkSecondary: "#9AA4B2",
  accent: "#E10600",
  highlight: "#FF2D2D",
} as const;

export const SAFE_MARGIN = 64;
export const WATERMARK_TEXT = "bhurajnaitik.observer";

export type DrawCmd =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; opacity?: number }
  | {
      kind: "image";
      x: number;
      y: number;
      w: number;
      h: number;
      src: string;
      fit: "cover" | "contain";
      opacity?: number;
    }
  | {
      kind: "text";
      x: number;
      y: number;
      w: number;
      text: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      fill: string;
      lineHeight: number;
      align: "left" | "center" | "right";
      letterSpacing?: number;
      uppercase?: boolean;
    }
  | { kind: "highlight-bar"; x: number; y: number; w: number; h: number; fill: string };

export interface Layout {
  width: number;
  height: number;
  commands: DrawCmd[];
}

/**
 * Build the canonical "BRO breaking" layout from a validated post.
 * `withWatermark=true` is server-only — the live editor preview MUST NOT pass true.
 */
export function computeLayout(post: Post, withWatermark = false): Layout {
  const { width, height } = FORMAT_DIMENSIONS[post.format];
  const cmds: DrawCmd[] = [];

  // 1. Base fill (acts as fallback if image fails to load)
  cmds.push({ kind: "rect", x: 0, y: 0, w: width, h: height, fill: TOKENS.bgBase });

  // 2. Background
  if (post.background.kind === "preset") {
    cmds.push({
      kind: "image",
      x: 0,
      y: 0,
      w: width,
      h: height,
      src: `/backgrounds/${post.background.slug}.svg`,
      fit: "cover",
      opacity: 1,
    });
  } else if (post.background.kind === "upload") {
    cmds.push({
      kind: "image",
      x: 0,
      y: 0,
      w: width,
      h: height,
      src: post.background.src,
      fit: "cover",
      opacity: 1,
    });
  } else {
    cmds.push({ kind: "rect", x: 0, y: 0, w: width, h: height, fill: post.background.color });
  }

  // 3. Dark gradient overlay for legibility (top-to-bottom, stronger at bottom)
  cmds.push({ kind: "rect", x: 0, y: 0, w: width, h: height, fill: TOKENS.bgBase, opacity: 0.45 });
  cmds.push({
    kind: "rect",
    x: 0,
    y: Math.floor(height * 0.45),
    w: width,
    h: Math.ceil(height * 0.55),
    fill: TOKENS.bgBase,
    opacity: 0.55,
  });

  // 4. BRO red top accent line
  cmds.push({ kind: "highlight-bar", x: 0, y: 0, w: width, h: 8, fill: TOKENS.accent });

  // 5. Eyebrow tag (top-left, monospace caps)
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: SAFE_MARGIN,
    w: width - SAFE_MARGIN * 2,
    text: post.countryName ? `BHU-RAJNAITIK · ${post.countryName.toUpperCase()}` : "BHU-RAJNAITIK OBSERVER",
    fontFamily: "JetBrains Mono",
    fontSize: 22,
    fontWeight: 600,
    fill: TOKENS.inkSecondary,
    lineHeight: 1.2,
    align: "left",
    letterSpacing: 4,
    uppercase: true,
  });

  // 6. Headline block — bottom-anchored, large
  const headlineSize = computeHeadlineFontSize(post.headline, width - SAFE_MARGIN * 2);
  const headlineLineHeight = 1.05;
  const subSize = 32;
  const subLineHeight = 1.4;

  // Reserve space from the bottom up
  const bottomPad = SAFE_MARGIN + 24;
  const subEstHeight = post.subheadline ? estimateLines(post.subheadline, width - SAFE_MARGIN * 2, subSize) * subSize * subLineHeight : 0;
  const headlineEstHeight = estimateLines(post.headline, width - SAFE_MARGIN * 2, headlineSize) * headlineSize * headlineLineHeight;

  let cursorY = height - bottomPad - subEstHeight;

  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: cursorY,
      w: width - SAFE_MARGIN * 2,
      text: post.subheadline,
      fontFamily: "Inter",
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: subLineHeight,
      align: "left",
    });
  }

  cursorY -= headlineEstHeight + 24;

  // Red underline accent above headline
  cmds.push({
    kind: "highlight-bar",
    x: SAFE_MARGIN,
    y: cursorY - 28,
    w: 96,
    h: 6,
    fill: TOKENS.accent,
  });

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: cursorY,
    w: width - SAFE_MARGIN * 2,
    text: post.headline,
    fontFamily: "Inter Tight",
    fontSize: headlineSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: headlineLineHeight,
    align: "left",
    letterSpacing: -0.02 * headlineSize,
  });

  // 7. Watermark — server only
  if (withWatermark) {
    cmds.push({
      kind: "text",
      x: width - SAFE_MARGIN - 320,
      y: height - SAFE_MARGIN - 8,
      w: 320,
      text: WATERMARK_TEXT,
      fontFamily: "JetBrains Mono",
      fontSize: 18,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1,
      align: "right",
      letterSpacing: 2,
    });
  }

  return { width, height, commands: cmds };
}

/** Pick a headline font size that fits roughly 3 lines on the canvas. */
function computeHeadlineFontSize(text: string, contentWidth: number): number {
  // Heuristic: average glyph ~0.55× font size at weight 800 Inter Tight
  // Aim for ≤ 3 lines.
  const charsPerLine = (size: number) => Math.floor(contentWidth / (size * 0.55));
  const candidates = [120, 104, 92, 80, 72, 64, 56];
  for (const size of candidates) {
    const cpl = charsPerLine(size);
    if (cpl <= 0) continue;
    const lines = Math.ceil(text.length / cpl);
    if (lines <= 3) return size;
  }
  return 56;
}

function estimateLines(text: string, contentWidth: number, fontSize: number): number {
  const cpl = Math.max(1, Math.floor(contentWidth / (fontSize * 0.5)));
  return Math.max(1, Math.ceil(text.length / cpl));
}
