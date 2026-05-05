import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/render/route";
import type { Post } from "@/lib/post-schema";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPost: Post = {
  background: { kind: "preset", slug: "world-dark" },
  headline: "Iran strikes Israeli air base",
  subheadline: "Tehran's deterrence calculus shifts as ballistic missile salvos target Negev base.",
  countryName: "Iran",
  highlightWords: [],
  format: "1080x1080",
};

describe("/api/render", () => {
  it("returns a valid PNG for a well-formed post", async () => {
    const res = await POST(makeRequest(validPost));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");

    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1024); // a real PNG of a 1080² canvas is well above 1KB
    for (let i = 0; i < PNG_MAGIC.length; i++) {
      expect(buf[i]).toBe(PNG_MAGIC[i]);
    }
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("http://localhost/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects payloads missing the headline", async () => {
    const bad = { ...validPost, headline: "" };
    const res = await POST(makeRequest(bad));
    expect(res.status).toBe(400);
  });

  it("works with a solid-color background", async () => {
    const post = { ...validPost, background: { kind: "solid" as const, color: "#0B0F14" } };
    const res = await POST(makeRequest(post));
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(1024);
  });
});
