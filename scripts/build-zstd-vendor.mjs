import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const entry = require.resolve("fzstd");

await mkdir("vendor", { recursive: true });

await build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "fzstd",
  platform: "browser",
  minify: true,
  outfile: "vendor/zstd.js",
});

console.log("vendor/zstd.js wurde erstellt.");
