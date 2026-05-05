import { expect, test } from "@playwright/test";

test("editor renders preview and exports a PNG", async ({ page }) => {
  await page.goto("/editor");

  // Konva preview mounts client-side; wait for canvas to appear
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });

  // Edit headline
  const headline = page.locator('textarea').first();
  await headline.fill("Iran strikes Israeli air base");

  // Export button triggers a download
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export PNG/i }).click();
  const download = await downloadPromise;

  // Save to a known path and check size
  const savedPath = await download.path();
  expect(savedPath).toBeTruthy();

  const fs = await import("node:fs/promises");
  const buf = await fs.readFile(savedPath!);
  expect(buf.byteLength).toBeGreaterThan(5000); // 1080² PNG is well above 5KB
  expect(buf[0]).toBe(0x89);
  expect(buf[1]).toBe(0x50);
  expect(buf[2]).toBe(0x4e);
  expect(buf[3]).toBe(0x47);
});

test("waitlist landing still works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Geopolitics/i })).toBeVisible();
});
