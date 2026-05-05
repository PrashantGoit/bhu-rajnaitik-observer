import type { FontStyle, Post, Tag } from "./post-schema";
import { FORMAT_DIMENSIONS, TAG_OPTIONS } from "./post-schema";

// ---------------------------------------------------------------------------
// Design tokens (locked — match docs/LAUNCH_PACKAGE.md and globals.css)
// ---------------------------------------------------------------------------
export const TOKENS = {
  bgBase: "#0B0F14",
  mapLand: "#1A2330",
  mapBorder: "#2A3645",
  inkPrimary: "#F5F7FA",
  inkSecondary: "#9AA4B2",
  accent: "#E10600",
  highlight: "#FF2D2D",
  amber: "#F59E0B",
} as const;

export const SAFE_MARGIN = 64;
export const BRAND_FOOTER_HEIGHT = 240;

// ---------------------------------------------------------------------------
// DrawCmd — emitted by computeLayout, consumed by both server canvas and Konva
// ---------------------------------------------------------------------------
export type Align = "left" | "center" | "right";

export interface TextSegment {
  text: string;
  fill: string;
}

export interface TextLineSpec {
  /** Pre-wrapped concatenated string for measurement parity */
  text: string;
  /** Optional multi-color segments. If absent, single fill is applied. */
  segments?: TextSegment[];
}

export type DrawCmd =
  | {
      kind: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
      opacity?: number;
    }
  | {
      kind: "highlight-bar";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
    }
  | {
      kind: "image";
      x: number;
      y: number;
      w: number;
      h: number;
      src: string;
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
      align: Align;
      letterSpacing?: number;
      uppercase?: boolean;
    }
  | {
      kind: "text-block";
      /** Bounding box (used for alignment math) */
      x: number;
      y: number;
      w: number;
      lineHeight: number;
      lines: Array<{
        segments: TextSegment[];
        align: Align;
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        letterSpacing: number;
        uppercase: boolean;
      }>;
    };

export interface Layout {
  width: number;
  height: number;
  commands: DrawCmd[];
}

// ---------------------------------------------------------------------------
// Font pairs
// ---------------------------------------------------------------------------
interface FontPair {
  display: string;
  body: string;
  mono: string;
}

const FONT_PAIRS: Record<FontStyle, FontPair> = {
  display: { display: "Inter Tight", body: "Inter", mono: "JetBrains Mono" },
  editorial: { display: "Inter", body: "Inter", mono: "JetBrains Mono" },
  techno: { display: "JetBrains Mono", body: "JetBrains Mono", mono: "JetBrains Mono" },
};

// ---------------------------------------------------------------------------
// Width estimation — empirical character-width ratios per font family.
// These are calibrated against rendered Inter / Inter Tight / JetBrains Mono
// so wrap decisions match what the canvas actually paints within ~3%.
// ---------------------------------------------------------------------------
function avgCharRatio(family: string, weight: number, uppercase: boolean): number {
  if (family === "JetBrains Mono") return uppercase ? 0.62 : 0.60;
  if (family === "Inter Tight") {
    const base = weight >= 700 ? 0.54 : 0.50;
    return uppercase ? base + 0.07 : base;
  }
  // Inter
  const base = weight >= 700 ? 0.52 : 0.48;
  return uppercase ? base + 0.08 : base;
}

function estimateTextWidth(
  text: string,
  family: string,
  weight: number,
  size: number,
  uppercase: boolean,
  letterSpacing: number,
): number {
  if (!text) return 0;
  const ratio = avgCharRatio(family, weight, uppercase);
  return text.length * size * ratio + Math.max(0, text.length - 1) * letterSpacing;
}

interface WrapResult {
  lines: string[];
  /** Whether at least one line had to be force-broken (single word too wide) */
  forced: boolean;
}

function wrapWords(
  text: string,
  maxWidth: number,
  family: string,
  weight: number,
  size: number,
  uppercase: boolean,
  letterSpacing: number,
): WrapResult {
  const trimmed = text.trim();
  if (!trimmed) return { lines: [""], forced: false };

  const measure = (s: string) =>
    estimateTextWidth(s, family, weight, size, uppercase, letterSpacing);

  const lines: string[] = [];
  let forced = false;

  const paragraphs = trimmed.split(/\n+/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) {
        lines.push(current);
      }
      // Word alone exceeds width: hard-break by character (rare but bounded)
      if (measure(word) > maxWidth) {
        forced = true;
        let chunk = "";
        for (const ch of word) {
          const next = chunk + ch;
          if (measure(next) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return { lines, forced };
}

/**
 * Pick the largest font size where the wrapped headline fits within both the
 * line count budget and the height budget. Adapts to text length: short
 * headlines get the biggest size, long ones step down gracefully.
 */
function fitFontSize(
  text: string,
  opts: {
    maxWidth: number;
    maxHeight: number;
    maxLines: number;
    minSize: number;
    maxSize: number;
    family: string;
    weight: number;
    uppercase: boolean;
    letterSpacing: (size: number) => number;
    lineHeight: number;
  },
): { size: number; lines: string[] } {
  // Try sizes from largest to smallest in 4px steps for stable layout
  for (let size = opts.maxSize; size >= opts.minSize; size -= 4) {
    const ls = opts.letterSpacing(size);
    const wrap = wrapWords(text, opts.maxWidth, opts.family, opts.weight, size, opts.uppercase, ls);
    if (wrap.lines.length > opts.maxLines) continue;
    const blockH = wrap.lines.length * size * opts.lineHeight;
    if (blockH > opts.maxHeight) continue;
    return { size, lines: wrap.lines };
  }
  // Fall through: smallest size, accept overflow but truncate lines
  const ls = opts.letterSpacing(opts.minSize);
  const wrap = wrapWords(
    text,
    opts.maxWidth,
    opts.family,
    opts.weight,
    opts.minSize,
    opts.uppercase,
    ls,
  );
  return { size: opts.minSize, lines: wrap.lines.slice(0, opts.maxLines) };
}

// ---------------------------------------------------------------------------
// Highlight word segmentation — splits a line into [{text, fill}] segments.
//
// Each entry in `highlightWords` may be a single word OR a multi-word phrase
// (e.g. "white house"). Matching rules:
//   • Case-insensitive.
//   • Whole-word for short entries (≤ 3 letters) to avoid silly hits like
//     "in" matching every word containing it.
//   • Prefix match for longer entries: "strike" highlights "strikes",
//     "striking". This is what users intuitively want for headlines.
//   • Phrases match consecutive word tokens, ignoring whitespace between them.
// ---------------------------------------------------------------------------
function buildHighlightedSegments(
  line: string,
  highlightWords: string[],
  baseFill: string,
  highlightFill: string,
  uppercase: boolean,
): TextSegment[] {
  if (!highlightWords.length) return [{ text: line, fill: baseFill }];
  const display = uppercase ? line.toUpperCase() : line;

  // Normalize each entry into a list of "phrase tokens" (lowercase, stripped
  // of punctuation). A single-word entry yields a length-1 phrase.
  const phrases: string[][] = [];
  for (const raw of highlightWords) {
    const parts = raw
      .toLowerCase()
      .split(/\s+/)
      .map((p) => p.replace(/[^a-z0-9'’\-]/g, ""))
      .filter(Boolean);
    if (parts.length) phrases.push(parts);
  }
  if (!phrases.length) return [{ text: display, fill: baseFill }];

  // Tokenize the line, keeping non-word runs (spaces, punctuation) as their
  // own segments so highlights can flow between words naturally.
  const re = /([A-Za-z0-9'’\-]+|[^A-Za-z0-9'’\-]+)/g;
  const tokens = display.match(re) ?? [display];

  // Pre-compute clean lowercase form for each word token (empty for non-words).
  const cleanTokens = tokens.map((t) =>
    /[A-Za-z0-9]/.test(t)
      ? t.toLowerCase().replace(/[^a-z0-9'’\-]/g, "")
      : "",
  );

  // Index map: for each phrase, find every consecutive run of word-tokens
  // that matches it. We mark token indices [start..end] as highlighted.
  const hits = new Array<boolean>(tokens.length).fill(false);

  function tokenMatches(tokIdx: number, target: string): boolean {
    const tok = cleanTokens[tokIdx];
    if (!tok) return false;
    if (target.length <= 3) return tok === target;
    return tok.startsWith(target);
  }

  for (const phrase of phrases) {
    for (let i = 0; i < tokens.length; i++) {
      if (!cleanTokens[i]) continue;
      // Try to match each phrase part against successive word-tokens,
      // skipping any non-word tokens between them.
      let cursor = i;
      let matched = true;
      for (let p = 0; p < phrase.length; p++) {
        // Advance past non-word tokens for parts after the first
        if (p > 0) {
          while (cursor < tokens.length && !cleanTokens[cursor]) cursor++;
          if (cursor >= tokens.length) {
            matched = false;
            break;
          }
        }
        if (!tokenMatches(cursor, phrase[p])) {
          matched = false;
          break;
        }
        cursor++;
      }
      if (matched) {
        // Highlight from i through cursor-1, and any non-word tokens between
        // word-tokens within that span (so spaces inside "WHITE HOUSE" go red).
        for (let k = i; k < cursor; k++) hits[k] = true;
      }
    }
  }

  const out: TextSegment[] = tokens.map((tok, idx) => ({
    text: tok,
    fill: hits[idx] ? highlightFill : baseFill,
  }));

  // Coalesce adjacent same-fill segments
  const coalesced: TextSegment[] = [];
  for (const s of out) {
    const last = coalesced[coalesced.length - 1];
    if (last && last.fill === s.fill) last.text += s.text;
    else coalesced.push({ ...s });
  }
  return coalesced;
}

// ---------------------------------------------------------------------------
// Layout entry point
// ---------------------------------------------------------------------------
export function computeLayout(post: Post, withWatermark: boolean): Layout {
  const dims = FORMAT_DIMENSIONS[post.format];
  const width = dims.width;
  const height = dims.height;
  const fonts = FONT_PAIRS[post.fontStyle];
  const cmds: DrawCmd[] = [];

  drawBackdrop(cmds, post, width, height);
  drawTopAccent(cmds, width);
  const tagBottomY = drawTagChip(cmds, post.tag, post.countryName ?? null, fonts, width);

  const layoutTopY = tagBottomY + 32;

  switch (post.layout) {
    case "breaking":
      drawBreaking(cmds, post, width, height, fonts, layoutTopY);
      break;
    case "stat":
      drawStat(cmds, post, width, height, fonts, layoutTopY);
      break;
    case "quote":
      drawQuote(cmds, post, width, height, fonts, layoutTopY);
      break;
    case "minimal":
      drawMinimal(cmds, post, width, height, fonts, layoutTopY);
      break;
    case "centered":
      drawCentered(cmds, post, width, height, fonts, layoutTopY);
      break;
  }

  drawHashtags(cmds, post, width, height, fonts);
  drawBrandingFooter(cmds, width, height, fonts, withWatermark);

  return { width, height, commands: cmds };
}

// ---------------------------------------------------------------------------
// Backdrop / chrome
// ---------------------------------------------------------------------------
function drawBackdrop(cmds: DrawCmd[], post: Post, w: number, h: number) {
  cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: TOKENS.bgBase });
  if (post.background.kind === "preset") {
    cmds.push({
      kind: "image",
      x: 0,
      y: 0,
      w,
      h,
      src: `/backgrounds/${post.background.slug}.svg`,
      opacity: 1,
    });
  } else if (post.background.kind === "upload") {
    cmds.push({ kind: "image", x: 0, y: 0, w, h, src: post.background.src, opacity: 0.95 });
    // Dark scrim for legibility
    cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: "#000000", opacity: 0.45 });
  } else {
    cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: post.background.color });
  }
}

function drawTopAccent(cmds: DrawCmd[], w: number) {
  cmds.push({ kind: "rect", x: 0, y: 0, w, h: 8, fill: TOKENS.accent });
}

function drawTagChip(
  cmds: DrawCmd[],
  tag: Tag,
  countryName: string | null,
  fonts: FontPair,
  w: number,
): number {
  const opt = TAG_OPTIONS.find((t) => t.kind === tag.kind) ?? TAG_OPTIONS[0];
  const labelRaw = tag.kind === "custom" && tag.customLabel ? tag.customLabel : opt.label;
  const label = labelRaw.toUpperCase();
  const fillByTone = {
    red: TOKENS.accent,
    amber: TOKENS.amber,
    ink: TOKENS.inkPrimary,
  } as const;
  const chipFill = fillByTone[opt.tone];
  const chipText = opt.tone === "ink" ? TOKENS.bgBase : "#FFFFFF";

  const fontSize = 22;
  const padX = 18;
  const padY = 10;
  const chipTextW = estimateTextWidth(label, fonts.mono, 700, fontSize, true, 4);
  const chipW = Math.ceil(chipTextW + padX * 2);
  const chipH = fontSize + padY * 2;
  const x = SAFE_MARGIN;
  const y = SAFE_MARGIN;

  cmds.push({ kind: "rect", x, y, w: chipW, h: chipH, fill: chipFill });
  cmds.push({
    kind: "text",
    x,
    y: y + padY - 2,
    w: chipW,
    text: label,
    fontFamily: fonts.mono,
    fontSize,
    fontWeight: 700,
    fill: chipText,
    lineHeight: 1,
    align: "center",
    letterSpacing: 4,
    uppercase: true,
  });

  if (countryName) {
    cmds.push({
      kind: "text",
      x: x + chipW + 16,
      y: y + padY,
      w: w - x - chipW - 16 - SAFE_MARGIN,
      text: countryName,
      fontFamily: fonts.mono,
      fontSize: 16,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.2,
      align: "left",
      letterSpacing: 3,
      uppercase: true,
    });
  }
  return y + chipH;
}

// ---------------------------------------------------------------------------
// Hashtags row — sits just above the brand footer
// ---------------------------------------------------------------------------
function drawHashtags(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  if (!post.hashtags?.length) return;
  const tags = post.hashtags
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean)
    .map((t) => `#${t}`);
  if (!tags.length) return;

  const text = tags.join("   ");
  const size = 20;
  const ls = 2;
  // Place 28px above the brand footer block
  const y = h - BRAND_FOOTER_HEIGHT - 36;

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y,
    w: w - SAFE_MARGIN * 2,
    text,
    fontFamily: fonts.mono,
    fontSize: size,
    fontWeight: 600,
    fill: TOKENS.amber,
    lineHeight: 1.2,
    align: "center",
    letterSpacing: ls,
  });
}

// ---------------------------------------------------------------------------
// Brand footer lockup (BHU-RAJNAITIK / line+tick / OBSERVER + domain)
// ---------------------------------------------------------------------------
function drawBrandingFooter(
  cmds: DrawCmd[],
  w: number,
  h: number,
  fonts: FontPair,
  withDomain: boolean,
) {
  const cx = Math.floor(w / 2);
  const baseSize = Math.min(w, h);
  const titleSize = Math.round(baseSize * 0.045);
  const lineY = h - SAFE_MARGIN - Math.round(titleSize * 1.6);
  const lineW = Math.round(baseSize * 0.32);
  const tickW = Math.round(lineW * 0.22);
  const lineH = 2;

  cmds.push({
    kind: "text",
    x: 0,
    y: lineY - Math.round(titleSize * 1.45),
    w,
    text: "BHU-RAJNAITIK",
    fontFamily: fonts.display,
    fontSize: titleSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: 1,
    align: "center",
    letterSpacing: titleSize * 0.18,
    uppercase: true,
  });

  cmds.push({
    kind: "highlight-bar",
    x: cx - Math.floor(lineW / 2),
    y: lineY,
    w: lineW,
    h: lineH,
    fill: TOKENS.inkPrimary,
  });
  cmds.push({
    kind: "highlight-bar",
    x: cx + Math.floor(lineW / 2) - tickW,
    y: lineY,
    w: tickW,
    h: lineH,
    fill: TOKENS.accent,
  });

  cmds.push({
    kind: "text",
    x: 0,
    y: lineY + Math.round(titleSize * 0.55),
    w,
    text: "OBSERVER",
    fontFamily: fonts.display,
    fontSize: titleSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: 1,
    align: "center",
    letterSpacing: titleSize * 0.32,
    uppercase: true,
  });

  if (withDomain) {
    cmds.push({
      kind: "text",
      x: 0,
      y: h - SAFE_MARGIN + 4,
      w,
      text: "bhurajnaitik.observer",
      fontFamily: fonts.mono,
      fontSize: Math.round(titleSize * 0.42),
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1,
      align: "center",
      letterSpacing: 3,
    });
  }
}

// ---------------------------------------------------------------------------
// Helper: build a multi-line text-block cmd from headline text with per-word
// red highlighting.
// ---------------------------------------------------------------------------
function buildHeadlineBlock(opts: {
  text: string;
  highlightWords: string[];
  x: number;
  y: number;
  w: number;
  family: string;
  weight: number;
  size: number;
  letterSpacing: number;
  lineHeight: number;
  align: Align;
  uppercase: boolean;
}): { cmd: DrawCmd; height: number; lines: number } {
  const wrap = wrapWords(
    opts.text,
    opts.w,
    opts.family,
    opts.weight,
    opts.size,
    opts.uppercase,
    opts.letterSpacing,
  );
  const lines = wrap.lines.map((line) => ({
    segments: buildHighlightedSegments(
      line,
      opts.highlightWords,
      TOKENS.inkPrimary,
      TOKENS.accent,
      opts.uppercase,
    ),
    align: opts.align,
    fontFamily: opts.family,
    fontSize: opts.size,
    fontWeight: opts.weight,
    letterSpacing: opts.letterSpacing,
    uppercase: opts.uppercase,
  }));
  return {
    cmd: {
      kind: "text-block",
      x: opts.x,
      y: opts.y,
      w: opts.w,
      lineHeight: opts.lineHeight,
      lines,
    },
    height: lines.length * opts.size * opts.lineHeight,
    lines: lines.length,
  };
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------
function reservedBottom(post: Post): number {
  return BRAND_FOOTER_HEIGHT + (post.hashtags?.length ? 56 : 0);
}

function drawBreaking(
  cmds: DrawCmd[],
  post: Post,
  w: number,
  h: number,
  fonts: FontPair,
  topY: number,
) {
  const contentW = w - SAFE_MARGIN * 2;
  const bottomY = h - reservedBottom(post) - 32;
  const usableH = bottomY - topY;

  // Subheadline budget
  let subBlockH = 0;
  let subLines: string[] = [];
  let subSize = 30;
  if (post.subheadline) {
    const fit = fitFontSize(post.subheadline, {
      maxWidth: contentW,
      maxHeight: Math.min(220, usableH * 0.35),
      maxLines: 4,
      minSize: 22,
      maxSize: 32,
      family: fonts.body,
      weight: 500,
      uppercase: false,
      letterSpacing: () => 0,
      lineHeight: 1.4,
    });
    subSize = fit.size;
    subLines = fit.lines;
    subBlockH = subLines.length * subSize * 1.4;
  }

  // Underline + headline budget
  const underlineGap = 28;
  const underlineH = 6;
  const subGap = post.subheadline ? 28 : 0;
  const headlineMaxH = usableH - subBlockH - subGap - underlineH - underlineGap;

  const headlineFit = fitFontSize(post.headline, {
    maxWidth: contentW,
    maxHeight: headlineMaxH,
    maxLines: 4,
    minSize: 56,
    maxSize: 144,
    family: fonts.display,
    weight: 800,
    uppercase: false,
    letterSpacing: (s) => -0.02 * s,
    lineHeight: 1.05,
  });
  const headlineH = headlineFit.lines.length * headlineFit.size * 1.05;

  // Anchor block to bottom of usable area
  const blockBottom = bottomY;
  const subY = blockBottom - subBlockH;
  const underlineY = subY - subGap - underlineH;
  const headlineY = underlineY - underlineGap - headlineH;

  cmds.push(
    buildHeadlineBlock({
      text: post.headline,
      highlightWords: post.highlightWords,
      x: SAFE_MARGIN,
      y: headlineY,
      w: contentW,
      family: fonts.display,
      weight: 800,
      size: headlineFit.size,
      letterSpacing: -0.02 * headlineFit.size,
      lineHeight: 1.05,
      align: "left",
      uppercase: false,
    }).cmd,
  );

  cmds.push({
    kind: "highlight-bar",
    x: SAFE_MARGIN,
    y: underlineY,
    w: 96,
    h: underlineH,
    fill: TOKENS.accent,
  });

  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: subY,
      w: contentW,
      text: subLines.join("\n"),
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.4,
      align: "left",
    });
  }
}

function drawStat(
  cmds: DrawCmd[],
  post: Post,
  w: number,
  h: number,
  fonts: FontPair,
  topY: number,
) {
  const contentW = w - SAFE_MARGIN * 2;
  const bottomY = h - reservedBottom(post) - 32;
  const usableH = bottomY - topY;
  const stat = post.stat ?? { value: "—", label: post.headline };

  // Headline (bottom)
  const headlineFit = fitFontSize(post.headline, {
    maxWidth: contentW,
    maxHeight: Math.min(180, usableH * 0.28),
    maxLines: 3,
    minSize: 36,
    maxSize: 56,
    family: fonts.display,
    weight: 700,
    uppercase: false,
    letterSpacing: (s) => -0.01 * s,
    lineHeight: 1.15,
  });
  const headlineH = headlineFit.lines.length * headlineFit.size * 1.15;

  // Subheadline (below headline) — small caption
  let subBlockH = 0;
  let subSize = 26;
  let subLines: string[] = [];
  if (post.subheadline) {
    const fit = fitFontSize(post.subheadline, {
      maxWidth: contentW,
      maxHeight: 100,
      maxLines: 3,
      minSize: 20,
      maxSize: 28,
      family: fonts.body,
      weight: 500,
      uppercase: false,
      letterSpacing: () => 0,
      lineHeight: 1.35,
    });
    subSize = fit.size;
    subLines = fit.lines;
    subBlockH = subLines.length * subSize * 1.35;
  }

  // Stat label (small, between value and headline divider)
  const labelFit = fitFontSize(stat.label, {
    maxWidth: contentW,
    maxHeight: 80,
    maxLines: 2,
    minSize: 24,
    maxSize: 36,
    family: fonts.body,
    weight: 600,
    uppercase: false,
    letterSpacing: () => 0,
    lineHeight: 1.3,
  });
  const labelH = labelFit.lines.length * labelFit.size * 1.3;

  // Stat value: largest piece, gets remaining space
  const dividerH = 4;
  const stack = labelH + 18 + dividerH + 36 + headlineH + (post.subheadline ? 24 + subBlockH : 0);
  const valueMaxH = usableH - stack;
  const valueMaxSize = Math.min(Math.floor(w * 0.34), Math.max(180, Math.floor(valueMaxH * 0.95)));

  const valueFit = fitFontSize(stat.value, {
    maxWidth: contentW,
    maxHeight: Math.max(160, valueMaxH),
    maxLines: 1,
    minSize: 120,
    maxSize: valueMaxSize,
    family: fonts.display,
    weight: 800,
    uppercase: false,
    letterSpacing: (s) => -0.04 * s,
    lineHeight: 1,
  });

  // Vertical packing — center the stat group in the available space, then
  // anchor headline+sub to the bottom.
  const valueY = topY + Math.max(0, Math.floor((valueMaxH - valueFit.size) / 2));
  const dividerY = valueY + valueFit.size + 24;
  const labelY = dividerY + 18;

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: valueY,
    w: contentW,
    text: stat.value,
    fontFamily: fonts.display,
    fontSize: valueFit.size,
    fontWeight: 800,
    fill: TOKENS.accent,
    lineHeight: 1,
    align: "center",
    letterSpacing: -0.04 * valueFit.size,
  });
  cmds.push({
    kind: "highlight-bar",
    x: Math.floor(w / 2 - 48),
    y: dividerY,
    w: 96,
    h: dividerH,
    fill: TOKENS.inkPrimary,
  });
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: labelY,
    w: contentW,
    text: labelFit.lines.join("\n"),
    fontFamily: fonts.body,
    fontSize: labelFit.size,
    fontWeight: 600,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.3,
    align: "center",
  });

  const subBlockTotal = post.subheadline ? subBlockH + 24 : 0;
  const headlineY = bottomY - subBlockTotal - headlineH;
  cmds.push(
    buildHeadlineBlock({
      text: post.headline,
      highlightWords: post.highlightWords,
      x: SAFE_MARGIN,
      y: headlineY,
      w: contentW,
      family: fonts.display,
      weight: 700,
      size: headlineFit.size,
      letterSpacing: -0.01 * headlineFit.size,
      lineHeight: 1.15,
      align: "center",
      uppercase: false,
    }).cmd,
  );
  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: bottomY - subBlockH,
      w: contentW,
      text: subLines.join("\n"),
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.35,
      align: "center",
    });
  }
}

function drawQuote(
  cmds: DrawCmd[],
  post: Post,
  w: number,
  h: number,
  fonts: FontPair,
  topY: number,
) {
  const contentW = w - SAFE_MARGIN * 2;
  const bottomY = h - reservedBottom(post) - 32;
  const usableH = bottomY - topY;

  // Big red opening quote glyph
  const glyphSize = 220;
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: topY - 20,
    w: 200,
    text: "\u201C",
    fontFamily: fonts.display,
    fontSize: glyphSize,
    fontWeight: 800,
    fill: TOKENS.accent,
    lineHeight: 1,
    align: "left",
  });

  const quoteFit = fitFontSize(post.headline, {
    maxWidth: contentW,
    maxHeight: usableH - 200,
    maxLines: 6,
    minSize: 36,
    maxSize: 88,
    family: fonts.display,
    weight: 700,
    uppercase: false,
    letterSpacing: (s) => -0.01 * s,
    lineHeight: 1.18,
  });
  const quoteH = quoteFit.lines.length * quoteFit.size * 1.18;
  const quoteY = topY + 110;

  cmds.push(
    buildHeadlineBlock({
      text: post.headline,
      highlightWords: post.highlightWords,
      x: SAFE_MARGIN,
      y: quoteY,
      w: contentW,
      family: fonts.display,
      weight: 700,
      size: quoteFit.size,
      letterSpacing: -0.01 * quoteFit.size,
      lineHeight: 1.18,
      align: "left",
      uppercase: false,
    }).cmd,
  );

  if (post.attribution) {
    const attrY = quoteY + quoteH + 36;
    cmds.push({
      kind: "highlight-bar",
      x: SAFE_MARGIN,
      y: attrY,
      w: 64,
      h: 4,
      fill: TOKENS.accent,
    });
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: attrY + 18,
      w: contentW,
      text: post.attribution,
      fontFamily: fonts.body,
      fontSize: 24,
      fontWeight: 600,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.3,
      align: "left",
      letterSpacing: 1,
      uppercase: true,
    });
  }
}

function drawMinimal(
  cmds: DrawCmd[],
  post: Post,
  w: number,
  h: number,
  fonts: FontPair,
  topY: number,
) {
  const contentW = w - SAFE_MARGIN * 3;
  const bottomY = h - reservedBottom(post) - 32;
  const usableH = bottomY - topY;

  let subBlockH = 0;
  let subSize = 28;
  let subLines: string[] = [];
  if (post.subheadline) {
    const fit = fitFontSize(post.subheadline, {
      maxWidth: contentW,
      maxHeight: 180,
      maxLines: 4,
      minSize: 22,
      maxSize: 32,
      family: fonts.body,
      weight: 500,
      uppercase: false,
      letterSpacing: () => 0,
      lineHeight: 1.4,
    });
    subSize = fit.size;
    subLines = fit.lines;
    subBlockH = subLines.length * subSize * 1.4;
  }

  const headlineFit = fitFontSize(post.headline, {
    maxWidth: contentW,
    maxHeight: usableH - subBlockH - 32,
    maxLines: 5,
    minSize: 48,
    maxSize: 120,
    family: fonts.display,
    weight: 800,
    uppercase: false,
    letterSpacing: (s) => -0.02 * s,
    lineHeight: 1.1,
  });
  const headlineH = headlineFit.lines.length * headlineFit.size * 1.1;

  const totalH = headlineH + (post.subheadline ? 32 + subBlockH : 0);
  const startY = topY + Math.max(0, Math.floor((usableH - totalH) / 2));

  cmds.push(
    buildHeadlineBlock({
      text: post.headline,
      highlightWords: post.highlightWords,
      x: Math.floor(SAFE_MARGIN * 1.5),
      y: startY,
      w: contentW,
      family: fonts.display,
      weight: 800,
      size: headlineFit.size,
      letterSpacing: -0.02 * headlineFit.size,
      lineHeight: 1.1,
      align: "center",
      uppercase: false,
    }).cmd,
  );
  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: Math.floor(SAFE_MARGIN * 1.5),
      y: startY + headlineH + 32,
      w: contentW,
      text: subLines.join("\n"),
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.4,
      align: "center",
    });
  }
}

function drawCentered(
  cmds: DrawCmd[],
  post: Post,
  w: number,
  h: number,
  fonts: FontPair,
  topY: number,
) {
  const contentW = w - SAFE_MARGIN * 2;
  const bottomY = h - reservedBottom(post) - 32;
  const usableH = bottomY - topY;

  let subBlockH = 0;
  let subSize = 28;
  let subLines: string[] = [];
  if (post.subheadline) {
    const fit = fitFontSize(post.subheadline, {
      maxWidth: contentW,
      maxHeight: 180,
      maxLines: 4,
      minSize: 22,
      maxSize: 32,
      family: fonts.body,
      weight: 500,
      uppercase: false,
      letterSpacing: () => 0,
      lineHeight: 1.4,
    });
    subSize = fit.size;
    subLines = fit.lines;
    subBlockH = subLines.length * subSize * 1.4;
  }

  const sepGap = 28;
  const sepH = 2;
  const headlineMaxH = usableH - subBlockH - (post.subheadline ? sepGap * 2 + sepH : 0);

  const headlineFit = fitFontSize(post.headline, {
    maxWidth: contentW,
    maxHeight: headlineMaxH,
    maxLines: 5,
    minSize: 56,
    maxSize: 132,
    family: fonts.display,
    weight: 800,
    uppercase: false,
    letterSpacing: (s) => -0.02 * s,
    lineHeight: 1.08,
  });
  const headlineH = headlineFit.lines.length * headlineFit.size * 1.08;

  const totalH = headlineH + (post.subheadline ? sepGap * 2 + sepH + subBlockH : 0);
  const blockTop = topY + Math.max(0, Math.floor((usableH - totalH) / 2));

  cmds.push(
    buildHeadlineBlock({
      text: post.headline,
      highlightWords: post.highlightWords,
      x: SAFE_MARGIN,
      y: blockTop,
      w: contentW,
      family: fonts.display,
      weight: 800,
      size: headlineFit.size,
      letterSpacing: -0.02 * headlineFit.size,
      lineHeight: 1.08,
      align: "center",
      uppercase: false,
    }).cmd,
  );

  if (post.subheadline) {
    const sepY = blockTop + headlineH + sepGap;
    const sepW = Math.round(w * 0.22);
    const tickW = Math.round(sepW * 0.25);
    const cx = Math.floor(w / 2);
    cmds.push({
      kind: "highlight-bar",
      x: cx - Math.floor(sepW / 2),
      y: sepY,
      w: sepW,
      h: sepH,
      fill: TOKENS.inkPrimary,
    });
    cmds.push({
      kind: "highlight-bar",
      x: cx + Math.floor(sepW / 2) - tickW,
      y: sepY,
      w: tickW,
      h: sepH,
      fill: TOKENS.accent,
    });
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: sepY + sepGap,
      w: contentW,
      text: subLines.join("\n"),
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.4,
      align: "center",
    });
  }
}
