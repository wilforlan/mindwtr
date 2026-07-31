import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const releaseDir = join(
  root,
  "node_modules/better-sqlite3/build/Release"
);
const nodePath = join(releaseDir, "better_sqlite3.node");
const metaPath = join(releaseDir, ".forge-meta");

const electronModules = "136";
const hasBinary = existsSync(nodePath);
const meta = existsSync(metaPath) ? readFileSync(metaPath, "utf8") : "";
const builtForElectron = meta.includes(electronModules);

if (hasBinary && builtForElectron) {
  process.exit(0);
}

console.log("Rebuilding better-sqlite3 for Electron…");
execSync("npx electron-rebuild -f -w better-sqlite3", {
  stdio: "inherit",
  cwd: root,
});
