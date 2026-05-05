import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/render/route";
import type { Post, LayoutKind, Format, TagKind } from "@/lib/post-schema";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const basePost: Post = {
  background: { kind: "preset", slug: "world-dark" },
  headline: "Iran strikes Israeli air base",
  subheadline:
    "Tehran's deterrence calculus shifts as ballistic missile salvos target Negev base.",
  countryName: "Iran",
  highlightWords: [],
  format: "1080x1080",
  layout: "breaking",
  tag: { kind: "breaking" },
  fontStyle: "display",
};

describe("/api/render", () => {
  it("returns valid PNG for the breaking layout", async () => {
    const res = await POST(makeRequest(basePost));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1024);
    for (let i = 0; i < PNG_MAGIC.length; i++) expect(buf[i]).toBe(PNG_MAGIC[i]);
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("http://localhost/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("rejects empty headline", async () => {
    const res = await POST(makeRequest({ ...basePost, headline: "" }));
    expect(res.status).toBe(400);
  });

  it("renders a solid background", async () => {
    const res = await POST(
      makeRequest({ ...basePost, background: { kind: "solid", color: "#0B0F14" } }),
    );
    expect(res.status).toBe(200);
  });

  it.each<LayoutKind>(["breaking", "stat", "quote", "minimal", "centered"])(
    "renders layout=%s",
    async (layout) => {
      const post: Post = {
        ...basePost,
        layout,
        stat: { value: "78%", label: "approval drop" },
        attribution: "Senior official",
      };
      const res = await POST(makeRequest(post));
      expect(res.status).toBe(200);
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.byteLength).toBeGreaterThan(1024);
    },
  );

  it.each<Format>(["1080x1080", "1080x1920", "1600x900"])("renders format=%s", async (format) => {
    const res = await POST(makeRequest({ ...basePost, format }));
    expect(res.status).toBe(200);
  });

  it.each<TagKind>([
    "breaking",
    "analysis",
    "alert",
    "intel",
    "deep-dive",
    "live",
    "explainer",
    "custom",
  ])("renders tag=%s", async (kind) => {
    const post: Post = {
      ...basePost,
      tag: { kind, customLabel: kind === "custom" ? "EXCLUSIVE" : undefined },
    };
    const res = await POST(makeRequest(post));
    expect(res.status).toBe(200);
  });

  it("renders headline with red highlightWords without crashing", async () => {
    const res = await POST(
      makeRequest({ ...basePost, highlightWords: ["Iran", "strikes"] }),
    );
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1024);
    for (let i = 0; i < PNG_MAGIC.length; i++) expect(buf[i]).toBe(PNG_MAGIC[i]);
  });

  it("renders hashtags row", async () => {
    const res = await POST(
      makeRequest({ ...basePost, hashtags: ["geopolitics", "#breaking", "iran"] }),
    );
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1024);
  });

  it("does not overflow with an absurdly long unbreakable word", async () => {
    const long = "supercalifragilisticexpialidocious".repeat(3).slice(0, 120);
    const res = await POST(makeRequest({ ...basePost, headline: long }));
    expect(res.status).toBe(200);
  });

  it("stat layout renders with empty subheadline (no overlap collision)", async () => {
    const res = await POST(
      makeRequest({
        ...basePost,
        layout: "stat",
        subheadline: "",
        stat: { value: "78%", label: "approval drop" },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("highlight word matching (computeLayout)", () => {
  // Pull computeLayout dynamically so we can introspect text segments.
  async function layoutFor(post: Post) {
    const { computeLayout, TOKENS } = await import("@/lib/render");
    return { layout: computeLayout(post, false), accent: TOKENS.accent };
  }

  function headlineSegments(layout: { commands: Array<{ kind: string }> }) {
    type Cmd = {
      kind: string;
      lines?: Array<{ segments?: Array<{ text: string; fill: string }> }>;
    };
    // Flatten segments across every text-block. Tests assert on red-vs-base
    // counts, which is independent of which block contains them.
    const blocks = (layout.commands as Cmd[]).filter((c) => c.kind === "text-block");
    return blocks.flatMap((b) => b.lines?.flatMap((l) => l.segments ?? []) ?? []);
  }

  it("prefix-matches: 'strike' highlights 'strikes'", async () => {
    const { layout, accent } = await layoutFor({
      ...basePost,
      headline: "Iran strikes Tehran",
      highlightWords: ["strike"],
    });
    const segs = headlineSegments(layout);
    const red = segs.filter((s) => s.fill === accent).map((s) => s.text);
    expect(red.join(" ").toLowerCase()).toContain("strikes");
  });

  it("phrase match: 'white house' highlights two consecutive words", async () => {
    const { layout, accent } = await layoutFor({
      ...basePost,
      headline: "White House",
      highlightWords: ["white house"],
    });
    const segs = headlineSegments(layout);
    const red = segs.filter((s) => s.fill === accent).map((s) => s.text).join("");
    expect(red.toLowerCase()).toContain("white");
    expect(red.toLowerCase()).toContain("house");
  });

  it("short entries (<=3 chars) require exact match, not prefix", async () => {
    const { layout, accent } = await layoutFor({
      ...basePost,
      headline: "Trust the bus driver",
      highlightWords: ["us"],
    });
    const segs = headlineSegments(layout);
    const red = segs.filter((s) => s.fill === accent).map((s) => s.text).join("");
    // 'us' should NOT match within 'Trust' or 'bus'
    expect(red.toLowerCase()).not.toContain("trust");
    expect(red.toLowerCase()).not.toContain("bus");
  });

  it("case-insensitive: lowercase entry matches uppercase headline render", async () => {
    const { layout, accent } = await layoutFor({
      ...basePost,
      headline: "Iran strikes Tehran",
      highlightWords: ["iran"],
    });
    const segs = headlineSegments(layout);
    const red = segs.filter((s) => s.fill === accent).map((s) => s.text).join("");
    expect(red.toUpperCase()).toContain("IRAN");
  });
});
