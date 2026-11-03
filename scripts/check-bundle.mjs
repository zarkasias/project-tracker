import { fileURLToPath } from "node:url";
import {
  BUNDLE_LIMIT_BYTES,
  exceedsBudget,
  measureBundle,
} from "./bundle-size.mjs";

try {
  const measurement = await measureBundle(
    fileURLToPath(new URL("../dist/", import.meta.url)),
  );
  console.log(
    JSON.stringify(
      {
        node: process.version,
        gzipLevel: 9,
        limitBytes: BUNDLE_LIMIT_BYTES,
        ...measurement,
      },
      null,
      2,
    ),
  );
  if (exceedsBudget(measurement)) {
    console.error(
      "Bundle exceeds the approved 102,400-byte combined gzip ceiling.",
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Bundle measurement failed:", error.message);
  process.exitCode = 1;
}
