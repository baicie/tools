import path from "node:path";
import { build } from "tsup";

import {
  DEFAULT,
  normalizePath,
  resolveInput,
  resolveTsConfig,
  target,
} from "./utils";
import type { ConfigExport } from "./config";

export async function dts(root: string, config: ConfigExport) {
  const {
    input = DEFAULT,
    watch = false,
    tsconfig = resolveTsConfig(root),
  } = config.options;
  const outputPath = path.resolve(root, "types");
  const inputPath = resolveInput(root, input);

  await build({
    entry: inputPath.map(normalizePath),
    dts: {
      only: true,
    },
    outDir: outputPath,
    tsconfig,
    target,
    watch,
    clean: true,
  });
}
