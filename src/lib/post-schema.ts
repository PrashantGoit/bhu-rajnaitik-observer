import { z } from "zod";

/**
 * Single source of truth for what a "post" is.
 * Both the client editor (Konva) and the server renderer (@napi-rs/canvas) consume this.
 */

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BackgroundSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("preset"),
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  }),
  z.object({
    kind: z.literal("upload"),
    // Allows http(s)://, /uploads/..., and data: URLs (data URLs can be ~7MB).
    src: z.string().min(1).max(8_000_000),
  }),
  z.object({
    kind: z.literal("solid"),
    color: z.string().regex(HEX_RE),
  }),
]);

export const FormatSchema = z.enum(["1080x1080", "1080x1920", "1600x900"]);
export const LayoutKindSchema = z.enum(["breaking", "stat", "quote", "minimal", "centered"]);
export const TagKindSchema = z.enum([
  "breaking",
  "analysis",
  "alert",
  "intel",
  "deep-dive",
  "live",
  "explainer",
  "custom",
]);

export const TagSchema = z.object({
  kind: TagKindSchema.default("breaking"),
  customLabel: z.string().max(28).optional(),
});

export const FontStyleSchema = z.enum(["display", "editorial", "techno"]);

export const StatSchema = z.object({
  value: z.string().min(1).max(16),
  label: z.string().min(1).max(80),
});

export const PostSchema = z.object({
  background: BackgroundSchema,
  headline: z.string().min(1).max(120),
  subheadline: z.string().max(200).default(""),
  countryName: z.string().max(48).nullable().default(null),
  highlightWords: z.array(z.string().min(1).max(40)).max(8).default([]),
  hashtags: z.array(z.string().min(1).max(30)).max(8).default([]),
  format: FormatSchema.default("1080x1080"),
  layout: LayoutKindSchema.default("breaking"),
  tag: TagSchema.default({ kind: "breaking" }),
  fontStyle: FontStyleSchema.default("display"),
  stat: StatSchema.optional(),
  attribution: z.string().max(80).optional(),
});

export type Post = z.infer<typeof PostSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type Format = z.infer<typeof FormatSchema>;
export type LayoutKind = z.infer<typeof LayoutKindSchema>;
export type TagKind = z.infer<typeof TagKindSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type FontStyle = z.infer<typeof FontStyleSchema>;
export type Stat = z.infer<typeof StatSchema>;

export const FORMAT_DIMENSIONS: Record<Format, { width: number; height: number }> = {
  "1080x1080": { width: 1080, height: 1080 },
  "1080x1920": { width: 1080, height: 1920 },
  "1600x900": { width: 1600, height: 900 },
};

export const PRESET_BACKGROUNDS = [
  { slug: "world-dark", name: "World — Dark Map" },
  { slug: "asia-dark", name: "Asia — Dark Map" },
  { slug: "europe-dark", name: "Europe — Dark Map" },
  { slug: "solid-base", name: "Solid Base (no map)" },
] as const;

export const LAYOUT_OPTIONS: Array<{ kind: LayoutKind; name: string; description: string }> = [
  { kind: "centered", name: "Centered (brand)", description: "Brand-style centered title with bottom branding" },
  { kind: "breaking", name: "Breaking", description: "Headline-led news card" },
  { kind: "stat", name: "Stat", description: "Big number, contextual caption" },
  { kind: "quote", name: "Quote", description: "Attributed pull-quote" },
  { kind: "minimal", name: "Minimal", description: "Centered headline only" },
];

export const TAG_OPTIONS: Array<{ kind: TagKind; label: string; tone: "red" | "amber" | "ink" }> = [
  { kind: "breaking", label: "BREAKING", tone: "red" },
  { kind: "alert", label: "ALERT", tone: "red" },
  { kind: "live", label: "LIVE", tone: "red" },
  { kind: "analysis", label: "ANALYSIS", tone: "ink" },
  { kind: "intel", label: "INTEL", tone: "amber" },
  { kind: "deep-dive", label: "DEEP DIVE", tone: "ink" },
  { kind: "explainer", label: "EXPLAINER", tone: "ink" },
  { kind: "custom", label: "CUSTOM", tone: "ink" },
];

export const FONT_STYLE_OPTIONS: Array<{ kind: FontStyle; name: string; description: string }> = [
  { kind: "display", name: "Display", description: "Inter Tight — BRO voice" },
  { kind: "editorial", name: "Editorial", description: "Inter — longform" },
  { kind: "techno", name: "Techno", description: "JetBrains Mono — intel" },
];

export const FORMAT_OPTIONS: Array<{ kind: Format; name: string; description: string }> = [
  { kind: "1080x1080", name: "Square", description: "1080×1080 · Instagram feed" },
  { kind: "1080x1920", name: "Story", description: "1080×1920 · IG/X stories" },
  { kind: "1600x900", name: "Wide", description: "1600×900 · X/Twitter card" },
];
