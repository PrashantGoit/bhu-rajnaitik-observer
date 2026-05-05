import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/ai/rewrite/route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/ai/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/ai/rewrite (stub mode)", () => {
  it("rewrites a headline deterministically when no API key is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(req({ text: "iran strikes israeli AIR base", kind: "headline" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { rewritten: string; source: string };
    expect(data.source).toBe("stub");
    expect(data.rewritten).toBe("Iran strikes israeli air base");
  });

  it("rejects missing text", async () => {
    const res = await POST(req({ text: "" }));
    expect(res.status).toBe(400);
  });
});
