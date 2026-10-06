import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const srcDir = path.join(root, "src", "cliplab");
const distDir = path.join(root, "dist", "cliplab");

fs.mkdirSync(distDir, { recursive: true });
for (const file of ["LICENSE", "PROVENANCE.md"]) {
  const src = path.join(srcDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, file));
  }
}
