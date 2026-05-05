import type { FontStyle, Post, Tag } from "./post-schema";
import { FORMAT_DIMENSIONS, TAG_OPTIONS } from "./post-schema";

/**
 * Pure layout module — produces an ordered list of draw commands that both
 * the Konva live preview and the server-side @napi-rs/canvas renderer iterate.
 *
 * Inputs and outputs are plain data so layouts are unit-testable without any
 * actual rendering surface.
 */

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

export function computeLayout(post: Post, withWatermark = false): Layout {
  const { width, height } = FORMAT_DIMENSIONS[post.format];
  const fonts = FONT_PAIRS[post.fontStyle];
  const cmds: DrawCmd[] = [];

  drawBackdrop(cmds, post, width, height);
  drawTopAccent(cmds, width);
  drawTagChip(cmds, post.tag, post.countryName, fonts);

  switch (post.layout) {
    case "breaking":
      drawBreakingLayout(cmds, post, width, height, fonts);
      break;
    case "stat":
      drawStatLayout(cmds, post, width, height, fonts);
      break;
    case "quote":
      drawQuoteLayout(cmds, post, width, height, fonts);
      break;
    case "minimal":
      drawMinimalLayout(cmds, post, width, height, fonts);
      break;
    case "centered":
      drawCenteredLayout(cmds, post, width, height, fonts);
      break;
  }

  drawBrandingFooter(cmds, width, height, fonts, withWatermark);

  return { width, height, commands: cmds };
}

// ─────────────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────────────

function drawBackdrop(cmds: DrawCmd[], post: Post, w: number, h: number) {
  cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: TOKENS.bgBase });
  if (post.background.kind === "preset") {
    cmds.push({ kind: "image", x: 0, y: 0, w, h, src: `/backgrounds/${post.background.slug}.svg`, fit: "cover", opacity: 1 });
  } else if (post.background.kind === "upload") {
    cmds.push({ kind: "image", x: 0, y: 0, w, h, src: post.background.src, fit: "cover", opacity: 1 });
  } else {
    cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: post.background.color });
  }
  // Dual-layer gradient overlay for legibility
  cmds.push({ kind: "rect", x: 0, y: 0, w, h, fill: TOKENS.bgBase, opacity: 0.45 });
  cmds.push({
    kind: "rect",
    x: 0,
    y: Math.floor(h * 0.45),
    w,
    h: Math.ceil(h * 0.55),
    fill: TOKENS.bgBase,
    opacity: 0.55,
  });
}

function drawTopAccent(cmds: DrawCmd[], w: number) {
  cmds.push({ kind: "highlight-bar", x: 0, y: 0, w, h: 8, fill: TOKENS.accent });
}

function drawTagChip(cmds: DrawCmd[], tag: Tag, countryName: string | null | undefined, fonts: FontPair) {
  const opt = TAG_OPTIONS.find((o) => o.kind === tag.kind) ?? TAG_OPTIONS[0];
  const label = (tag.kind === "custom" && tag.customLabel?.trim()) || opt.label;

  const chipBg = opt.tone === "red" ? TOKENS.accent : opt.tone === "amber" ? TOKENS.amber : TOKENS.inkPrimary;
  const chipFg = opt.tone === "ink" ? TOKENS.bgBase : TOKENS.inkPrimary;

  // Approximate chip width based on label length (no measureText available here)
  const fontSize = 22;
  const padX = 18;
  const chipH = 38;
  const charW = fontSize * 0.72; // mono caps approx
  const chipW = Math.ceil(label.length * charW + padX * 2);

  // Tag chip
  cmds.push({ kind: "rect", x: SAFE_MARGIN, y: SAFE_MARGIN, w: chipW, h: chipH, fill: chipBg });
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN + padX,
    y: SAFE_MARGIN + 8,
    w: chipW - padX * 2,
    text: label,
    fontFamily: fonts.mono,
    fontSize,
    fontWeight: 700,
    fill: chipFg,
    lineHeight: 1,
    align: "left",
    letterSpacing: 3,
    uppercase: true,
  });

  // Eyebrow / country marker — only show when a country is set; brand goes in footer.
  if (countryName) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN + chipW + 16,
      y: SAFE_MARGIN + 12,
      w: 600,
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
}

function drawBrandingFooter(
  cmds: DrawCmd[],
  w: number,
  h: number,
  fonts: FontPair,
  withDomain: boolean,
) {
  // Centered "BHU-RAJNAITIK" / horizontal line + red tick / "OBSERVER" lockup,
  // mirrors the reference brand identity. Sized relative to canvas width so it
  // scales gracefully across 1080x1080, 1080x1920, and 1600x900 formats.
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

  // Thin white separator line
  cmds.push({
    kind: "highlight-bar",
    x: cx - Math.floor(lineW / 2),
    y: lineY,
    w: lineW,
    h: lineH,
    fill: TOKENS.inkPrimary,
  });
  // Red tick on the right end
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

// ─────────────────────────────────────────────────────────────────────
// Layouts
// ─────────────────────────────────────────────────────────────────────

function drawBreakingLayout(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  const headlineSize = computeHeadlineFontSize(post.headline, w - SAFE_MARGIN * 2, 3);
  const headlineLineHeight = 1.05;
  const subSize = Math.round(headlineSize * 0.36);
  const subLineHeight = 1.4;
  const bottomPad = BRAND_FOOTER_HEIGHT;

  const subEstHeight = post.subheadline
    ? estimateLines(post.subheadline, w - SAFE_MARGIN * 2, subSize) * subSize * subLineHeight
    : 0;
  const headlineEstHeight = estimateLines(post.headline, w - SAFE_MARGIN * 2, headlineSize) * headlineSize * headlineLineHeight;

  let cursorY = h - bottomPad - subEstHeight;

  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: cursorY,
      w: w - SAFE_MARGIN * 2,
      text: post.subheadline,
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: subLineHeight,
      align: "left",
    });
  }

  cursorY -= headlineEstHeight + 24;

  cmds.push({ kind: "highlight-bar", x: SAFE_MARGIN, y: cursorY - 28, w: 96, h: 6, fill: TOKENS.accent });

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: cursorY,
    w: w - SAFE_MARGIN * 2,
    text: post.headline,
    fontFamily: fonts.display,
    fontSize: headlineSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: headlineLineHeight,
    align: "left",
    letterSpacing: -0.02 * headlineSize,
  });
}

function drawStatLayout(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  const stat = post.stat ?? { value: "—", label: post.headline };

  // Vertical budget after top accent + tag chip (~150px) and brand footer.
  const topReserved = 180;
  const bottomReserved = BRAND_FOOTER_HEIGHT;
  const usableH = h - topReserved - bottomReserved;

  // Sub block needs ~110px, headline block ~140px
  const subBlockH = post.subheadline ? 100 : 0;
  const headlineBlockH = 140;
  const labelBlockH = 70;
  const dividerGap = 28;
  const valueRegionH = usableH - subBlockH - headlineBlockH - labelBlockH - dividerGap - 60;

  const valueSize = Math.min(Math.floor(w * 0.32), Math.max(220, valueRegionH));
  const valueY = topReserved + Math.max(0, Math.floor((valueRegionH - valueSize) / 2));

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: valueY,
    w: w - SAFE_MARGIN * 2,
    text: stat.value,
    fontFamily: fonts.display,
    fontSize: valueSize,
    fontWeight: 800,
    fill: TOKENS.accent,
    lineHeight: 1,
    align: "center",
    letterSpacing: -0.04 * valueSize,
  });

  const dividerY = valueY + valueSize + 24;
  cmds.push({
    kind: "highlight-bar",
    x: Math.floor(w / 2 - 48),
    y: dividerY,
    w: 96,
    h: 4,
    fill: TOKENS.inkPrimary,
  });

  const labelSize = 36;
  const labelY = dividerY + 24;
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: labelY,
    w: w - SAFE_MARGIN * 2,
    text: stat.label,
    fontFamily: fonts.body,
    fontSize: labelSize,
    fontWeight: 600,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.3,
    align: "center",
  });

  const headlineSize = 56;
  const headlineY = h - bottomReserved - 60 - subBlockH - 80;
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: headlineY,
    w: w - SAFE_MARGIN * 2,
    text: post.headline,
    fontFamily: fonts.display,
    fontSize: headlineSize,
    fontWeight: 700,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.15,
    align: "center",
    letterSpacing: -0.01 * headlineSize,
  });
  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: headlineY + 80,
      w: w - SAFE_MARGIN * 2,
      text: post.subheadline,
      fontFamily: fonts.body,
      fontSize: 30,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.35,
      align: "center",
    });
  }
}

function drawQuoteLayout(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  // Big red opening quote glyph
  const glyphSize = Math.round(w * 0.22);
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: Math.floor(h * 0.18),
    w: glyphSize * 2,
    text: "\u201C",
    fontFamily: fonts.display,
    fontSize: glyphSize,
    fontWeight: 900,
    fill: TOKENS.accent,
    lineHeight: 1,
    align: "left",
  });

  // Quote text
  const quoteSize = computeHeadlineFontSize(post.headline, w - SAFE_MARGIN * 2, 5);
  const quoteY = Math.floor(h * 0.18) + glyphSize * 0.7;
  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: quoteY,
    w: w - SAFE_MARGIN * 2,
    text: post.headline,
    fontFamily: fonts.display,
    fontSize: quoteSize,
    fontWeight: 700,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.18,
    align: "left",
    letterSpacing: -0.01 * quoteSize,
  });

  // Attribution
  if (post.attribution) {
    const attrY = h - BRAND_FOOTER_HEIGHT - 64;
    cmds.push({ kind: "highlight-bar", x: SAFE_MARGIN, y: attrY, w: 64, h: 4, fill: TOKENS.accent });
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN,
      y: attrY + 18,
      w: w - SAFE_MARGIN * 2,
      text: post.attribution,
      fontFamily: fonts.mono,
      fontSize: 22,
      fontWeight: 600,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.3,
      align: "left",
      letterSpacing: 2,
      uppercase: true,
    });
  }
}

function drawMinimalLayout(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  const headlineSize = computeHeadlineFontSize(post.headline, w - SAFE_MARGIN * 4, 4);
  const lines = estimateLines(post.headline, w - SAFE_MARGIN * 4, headlineSize);
  const blockHeight = lines * headlineSize * 1.1;
  const topReserved = 180;
  const bottomReserved = BRAND_FOOTER_HEIGHT;
  const usableMid = topReserved + (h - topReserved - bottomReserved) / 2;
  const startY = Math.floor(usableMid - blockHeight / 2);

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN * 2,
    y: startY,
    w: w - SAFE_MARGIN * 4,
    text: post.headline,
    fontFamily: fonts.display,
    fontSize: headlineSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.1,
    align: "center",
    letterSpacing: -0.02 * headlineSize,
  });

  if (post.subheadline) {
    cmds.push({
      kind: "text",
      x: SAFE_MARGIN * 2,
      y: startY + blockHeight + 32,
      w: w - SAFE_MARGIN * 4,
      text: post.subheadline,
      fontFamily: fonts.body,
      fontSize: Math.round(headlineSize * 0.34),
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.4,
      align: "center",
    });
  }
}

function drawCenteredLayout(cmds: DrawCmd[], post: Post, w: number, h: number, fonts: FontPair) {
  // Brand-aligned layout: centered title with white-line + red-tick separator
  // (mirrors the BHU-RAJNAITIK / OBSERVER lockup) and an optional subhead.
  const topReserved = 180;
  const bottomReserved = BRAND_FOOTER_HEIGHT;
  const midY = topReserved + (h - topReserved - bottomReserved) / 2;

  const headlineSize = computeHeadlineFontSize(post.headline, w - SAFE_MARGIN * 3, 4);
  const headlineLines = estimateLines(post.headline, w - SAFE_MARGIN * 3, headlineSize);
  const headlineBlockH = headlineLines * headlineSize * 1.08;

  const subSize = Math.round(headlineSize * 0.32);
  const subBlockH = post.subheadline
    ? estimateLines(post.subheadline, w - SAFE_MARGIN * 3, subSize) * subSize * 1.4
    : 0;

  const sepGap = 28;
  const sepH = 2;
  const totalH = headlineBlockH + (post.subheadline ? sepGap * 2 + sepH + subBlockH : 0);
  const blockTop = Math.floor(midY - totalH / 2);

  cmds.push({
    kind: "text",
    x: SAFE_MARGIN,
    y: blockTop,
    w: w - SAFE_MARGIN * 2,
    text: post.headline,
    fontFamily: fonts.display,
    fontSize: headlineSize,
    fontWeight: 800,
    fill: TOKENS.inkPrimary,
    lineHeight: 1.08,
    align: "center",
    letterSpacing: -0.02 * headlineSize,
  });

  if (post.subheadline) {
    const sepY = blockTop + headlineBlockH + sepGap;
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
      w: w - SAFE_MARGIN * 2,
      text: post.subheadline,
      fontFamily: fonts.body,
      fontSize: subSize,
      fontWeight: 500,
      fill: TOKENS.inkSecondary,
      lineHeight: 1.4,
      align: "center",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Heuristics (pure)
// ─────────────────────────────────────────────────────────────────────

function computeHeadlineFontSize(text: string, contentWidth: number, maxLines: number): number {
  const charsPerLine = (size: number) => Math.floor(contentWidth / (size * 0.55));
  const candidates = [140, 120, 104, 92, 80, 72, 64, 56, 48];
  for (const size of candidates) {
    const cpl = charsPerLine(size);
    if (cpl <= 0) continue;
    const lines = Math.ceil(text.length / cpl);
    if (lines <= maxLines) return size;
  }
  return 48;
}

function estimateLines(text: string, contentWidth: number, fontSize: number): number {
  const cpl = Math.max(1, Math.floor(contentWidth / (fontSize * 0.5)));
  return Math.max(1, Math.ceil(text.length / cpl));
}
