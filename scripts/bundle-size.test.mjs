import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import {
  BUNDLE_LIMIT_BYTES,
  exceedsBudget,
  measureBundle,
} from "./bundle-size.mjs";

test("counts nested JS/CSS separately with level 9 gzip and ignores maps/other assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tracker-bundle-"));
  try {
    await mkdir(join(directory, "lazy"));
    const assets = {
      "app.js": "const app = 1;",
      "lazy/chunk.js": "export default 2;",
      "style.css": "body { color: red; }",
    };
    for (const [path, content] of Object.entries(assets)) {
      await writeFile(join(directory, path), content);
    }
    await writeFile(join(directory, "app.js.map"), "ignored");
    await writeFile(join(directory, "index.html"), "ignored");
    const result = await measureBundle(directory);
    const size = (path) => gzipSync(assets[path], { level: 9 }).length;
    assert.deepEqual(
      result.files,
      Object.keys(assets)
        .sort()
        .map((path) => ({
          path,
          rawBytes: Buffer.byteLength(assets[path]),
          gzipBytes: size(path),
        })),
    );
    assert.deepEqual(result.gzipBytes, {
      js: size("app.js") + size("lazy/chunk.js"),
      css: size("style.css"),
      combined: size("app.js") + size("lazy/chunk.js") + size("style.css"),
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects absent and asset-free output instead of reporting a false pass", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tracker-empty-"));
  try {
    await assert.rejects(measureBundle(join(directory, "missing")), {
      code: "ENOENT",
    });
    await assert.rejects(measureBundle(directory), /No JavaScript\/CSS assets/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("accepts the exact ceiling and rejects one byte over", () => {
  assert.equal(
    exceedsBudget({ gzipBytes: { combined: BUNDLE_LIMIT_BYTES } }),
    false,
  );
  assert.equal(
    exceedsBudget({ gzipBytes: { combined: BUNDLE_LIMIT_BYTES + 1 } }),
    true,
  );
});
