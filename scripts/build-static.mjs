// Builds the static GitHub Pages bundle.
// Steps:
//   1. Temporarily move src/app/api out of the way (output: 'export' errors
//      on dynamic API routes).
//   2. Run `next build` with STATIC=1.
//   3. Restore src/app/api unconditionally — even on failure.
//
// Run with: pnpm build:static

import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const stash = path.join(root, "src", "app", "_api_stash_static");
const nextCache = path.join(root, ".next");

let moved = false;
try {
  if (existsSync(apiDir)) {
    if (existsSync(stash)) {
      throw new Error(
        `Stash already exists at ${stash}. Move/delete it before retrying.`,
      );
    }
    renameSync(apiDir, stash);
    moved = true;
    console.log("[build:static] moved src/app/api → _api_stash_static");
  }

  // Stale type validators from a previous dev/build reference api routes that
  // are now moved. A clean .next folder avoids "Cannot find module" errors.
  if (existsSync(nextCache)) {
    rmSync(nextCache, { recursive: true, force: true });
    console.log("[build:static] cleared .next");
  }

  const env = {
    ...process.env,
    STATIC: "1",
    NEXT_PUBLIC_STATIC: "1",
  };
  execSync("next build", { stdio: "inherit", env });
  console.log("[build:static] success → ./out");
} finally {
  if (moved) {
    renameSync(stash, apiDir);
    console.log("[build:static] restored src/app/api");
  }
}
