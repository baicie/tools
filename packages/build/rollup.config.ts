import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import MagicString from "magic-string";
import type { Plugin } from "rollup";
import { defineConfig } from "rollup";
import esbuild, { type Options as esbuildOptions } from "rollup-plugin-esbuild";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)).toString()
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const sharedNodeOptions = defineConfig({
  treeshake: {
    moduleSideEffects: "no-external",
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
  output: {
    dir: "./dist/es",
    entryFileNames: `[name].js`,
    chunkFileNames: "chunks/dep-[hash].js",
    exports: "named",
    format: "esm",
    externalLiveBindings: false,
    freeze: false,
  },
  onwarn(warning, warn) {
    if (warning.message.includes("Circular dependency")) {
      return;
    }
    warn(warning);
  },
});

const cjsConfig = defineConfig({
  ...sharedNodeOptions,
  input: {
    index: path.resolve(__dirname, "src/index.ts"),
    cli: path.resolve(__dirname, "src/cli.ts"),
  },
  output: {
    dir: "./dist/cjs",
    entryFileNames: `[name].cjs`,
    chunkFileNames: "chunks/dep-[hash].js",
    exports: "named",
    format: "cjs",
    externalLiveBindings: false,
    freeze: false,
    sourcemap: false,
  },
  external: ["fsevents", ...Object.keys(pkg.dependencies)],
  plugins: [...createSharedNodePlugins({}), bundleSizeLimit(375)],
});

function createSharedNodePlugins({
  esbuildOptions,
}: {
  esbuildOptions?: esbuildOptions;
}): Plugin[] {
  return [
    nodeResolve({ preferBuiltins: true }),
    esbuild({
      tsconfig: path.resolve(__dirname, "tsconfig.json"),
      target: "node18",
      ...esbuildOptions,
    }),
    commonjs({
      extensions: [".js"],
      // Optional peer deps of ws. Native deps that are mostly for performance.
      // Since ws is not that perf critical for us, just ignore these deps.
      ignore: ["bufferutil", "utf-8-validate"],
      sourceMap: false,
    }),
    json(),
  ];
}

const nodeConfig = defineConfig({
  ...sharedNodeOptions,
  input: {
    index: path.resolve(__dirname, "src/index.ts"),
    cli: path.resolve(__dirname, "src/cli.ts"),
  },
  external: ["fsevents", ...Object.keys(pkg.dependencies)],
  plugins: [...createSharedNodePlugins({}), cjsPatchPlugin()],
});

export default defineConfig([nodeConfig, cjsConfig]);

/**
 * Inject CJS Context for each deps chunk
 */
function cjsPatchPlugin(): Plugin {
  const cjsPatch = `
import { fileURLToPath as __cjs_fileURLToPath } from 'node:url';
import { dirname as __cjs_dirname } from 'node:path';
import { createRequire as __cjs_createRequire } from 'node:module';

const __filename = __cjs_fileURLToPath(import.meta.url);
const __dirname = __cjs_dirname(__filename);
const require = __cjs_createRequire(import.meta.url);
const __require = require;
`.trimStart();

  return {
    name: "cjs-chunk-patch",
    renderChunk(code, chunk) {
      if (!chunk.fileName.includes("chunks/dep-")) return;
      const match = /^(?:import[\s\S]*?;\s*)+/.exec(code);
      const index = match ? match.index! + match[0].length : 0;
      const s = new MagicString(code);
      // inject after the last `import`
      s.appendRight(index, cjsPatch);
      console.log("patched cjs context: " + chunk.fileName);
      return s.toString();
    },
  };
}

/**
 * Guard the bundle size
 *
 * @param limit size in kB
 */
function bundleSizeLimit(limit: number): Plugin {
  let size = 0;

  return {
    name: "bundle-limit",
    generateBundle(_, bundle) {
      size = Buffer.byteLength(
        Object.values(bundle)
          .map((i) => ("code" in i ? i.code : ""))
          .join(""),
        "utf-8"
      );
    },
    closeBundle() {
      const kb = size / 1000;
      if (kb > limit) {
        this.error(
          `Bundle size exceeded ${limit} kB, current size is ${kb.toFixed(
            2
          )}kb.`
        );
      }
    },
  };
}

// #endregion
