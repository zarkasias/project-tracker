import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { gzipSync } from "node:zlib";

export const BUNDLE_LIMIT_BYTES = 102_400;

async function assetPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return assetPaths(path);
      if (entry.isFile() && /\.(js|css)$/.test(entry.name)) return [path];
      return [];
    }),
  );
  return groups.flat();
}

export async function measureBundle(directory) {
  const paths = (await assetPaths(directory)).sort();
  if (paths.length === 0) {
    throw new Error("No JavaScript/CSS assets found. Run npm run build first.");
  }
  const files = await Promise.all(
    paths.map(async (path) => {
      const content = await readFile(path);
      return {
        path: relative(directory, path).split(sep).join("/"),
        rawBytes: content.length,
        gzipBytes: gzipSync(content, { level: 9 }).length,
      };
    }),
  );
  const totals = { js: 0, css: 0, combined: 0 };
  for (const file of files) {
    totals[file.path.endsWith(".js") ? "js" : "css"] += file.gzipBytes;
    totals.combined += file.gzipBytes;
  }
  return { files, gzipBytes: totals };
}

export function exceedsBudget(measurement) {
  return measurement.gzipBytes.combined > BUNDLE_LIMIT_BYTES;
}
