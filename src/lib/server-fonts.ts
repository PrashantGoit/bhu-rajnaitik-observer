import { GlobalFonts } from "@napi-rs/canvas";
import path from "node:path";

/**
 * Register bundled fonts with @napi-rs/canvas exactly once per process.
 * @fontsource ships .woff files in node_modules/@fontsource/<family>/files/.
 *
 * Family names registered here MUST match the `fontFamily` strings emitted
 * by computeLayout() in src/lib/render.ts.
 */

let registered = false;

interface FontFile {
  weight: number;
  italic?: boolean;
  pkg: string;
  fileBasename: string;
}

const REGISTRATIONS: Array<{ family: string; files: FontFile[] }> = [
  {
    family: "Inter",
    files: [
      { weight: 400, pkg: "@fontsource/inter", fileBasename: "inter-latin-400-normal" },
      { weight: 500, pkg: "@fontsource/inter", fileBasename: "inter-latin-500-normal" },
      { weight: 600, pkg: "@fontsource/inter", fileBasename: "inter-latin-600-normal" },
      { weight: 700, pkg: "@fontsource/inter", fileBasename: "inter-latin-700-normal" },
    ],
  },
  {
    family: "Inter Tight",
    files: [
      { weight: 600, pkg: "@fontsource/inter-tight", fileBasename: "inter-tight-latin-600-normal" },
      { weight: 700, pkg: "@fontsource/inter-tight", fileBasename: "inter-tight-latin-700-normal" },
      { weight: 800, pkg: "@fontsource/inter-tight", fileBasename: "inter-tight-latin-800-normal" },
      { weight: 900, pkg: "@fontsource/inter-tight", fileBasename: "inter-tight-latin-900-normal" },
    ],
  },
  {
    family: "JetBrains Mono",
    files: [
      { weight: 400, pkg: "@fontsource/jetbrains-mono", fileBasename: "jetbrains-mono-latin-400-normal" },
      { weight: 500, pkg: "@fontsource/jetbrains-mono", fileBasename: "jetbrains-mono-latin-500-normal" },
      { weight: 600, pkg: "@fontsource/jetbrains-mono", fileBasename: "jetbrains-mono-latin-600-normal" },
      { weight: 700, pkg: "@fontsource/jetbrains-mono", fileBasename: "jetbrains-mono-latin-700-normal" },
    ],
  },
];

export function ensureFontsRegistered(): void {
  if (registered) return;
  registered = true;

  for (const { family, files } of REGISTRATIONS) {
    for (const f of files) {
      // Try .woff first (best @napi-rs/canvas support), fall back to .woff2
      const candidates = [".woff", ".woff2"].map((ext) =>
        path.join(process.cwd(), "node_modules", f.pkg, "files", `${f.fileBasename}${ext}`),
      );
      let registeredOk = false;
      for (const filePath of candidates) {
        try {
          // GlobalFonts.registerFromPath returns boolean
          const ok = GlobalFonts.registerFromPath(filePath, family);
          if (ok) {
            registeredOk = true;
            break;
          }
        } catch {
          // Try next extension
        }
      }
      if (!registeredOk && process.env.NODE_ENV !== "test") {
        console.warn(`[bro-fonts] Could not register ${family} weight ${f.weight}`);
      }
    }
  }
}
