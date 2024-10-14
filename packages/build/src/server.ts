import { build, watchFuc } from "./build";
import { resolveConfig } from "./config";
import { compile } from "./gulp";

export interface InlineOptions {
  /**
   * @description
   */
  input?: string;
  sourcemap?: boolean;
  dts?: boolean;
  ant?: boolean;
  dtsDir?: string;
  tsconfig?: string;
  watch?: boolean;
  minify?: boolean;
  full?: boolean;
  name?: string;
  visualizer?: boolean;
  "ignore-error"?: boolean;
  treeshake?: boolean;
}

export async function server(inline: InlineOptions = {}) {
  const root = process.cwd();

  const config = await resolveConfig(root, inline);
  const { options } = config;
  if (options.watch) await watchFuc(root, config);
  else {
    if (options.ant) {
      await build(root, config);
      await compile(root, config, "esm");
      await compile(root, config, "cjs");
    } else {
      await build(root, config);
    }
  }
}
