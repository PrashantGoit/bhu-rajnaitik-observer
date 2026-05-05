import { z } from "zod";

/**
 * Single source of truth for what a "post" is.
 * Both the client editor (Konva) and the server renderer (@napi-rs/canvas) consume this.
 * If you change this, both renderers stay in sync.
 */

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BackgroundSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("preset"),
    /** slug from /public/backgrounds/<slug>.{png,jpg,svg} */
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  }),
  z.object({
    kind: z.literal("upload"),
    /** Absolute URL or /uploads/<id>.webp from /api/upload */
    src: z.string().min(1).max(512),
  }),
  z.object({
    kind: z.literal("solid"),
    color: z.string().regex(HEX_RE),
  }),
]);

export const FormatSchema = z.enum(["1080x1080", "1080x1920", "1600x900"]);

export const PostSchema = z.object({
  background: BackgroundSchema,
  headline: z.string().min(1).max(120),
  subheadline: z.string().max(200).default(""),
  countryName: z.string().max(48).nullable().default(null),
  /** Words to highlight in red. Case-insensitive whole-word match. */
  highlightWords: z.array(z.string().min(1).max(40)).max(8).default([]),
  format: FormatSchema.default("1080x1080"),
});

export type Post = z.infer<typeof PostSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type Format = z.infer<typeof FormatSchema>;

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
