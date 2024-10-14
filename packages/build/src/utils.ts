import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findWorkspacePackages } from "@pnpm/find-workspace-packages";
import { globSync } from "fast-glob";
import type { ModuleFormat } from "rollup";
// import name fr

export const DEFAULT = "src";
const deps_default = ["preact/compat"];
const ignore = ["react", "react-dom"];
export async function generateExternal(root: string) {
  const packages = await findWorkspacePackages(root);
  const { manifest } = packages[0];
  const deps = [
    ...Object.keys(manifest.dependencies ?? []),
    ...Object.keys(manifest.peerDependencies ?? []),
  ]
    .filter((item) => !item.startsWith("@types/"))
    .filter((item) => !ignore.includes(item));
  return [...deps_default, ...deps].map(
    (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
}

export const target = "es2018";

export const modules = ["esm", "cjs"] as const;
export type Module = (typeof modules)[number];
export interface BuildInfo {
  module: "ESNext" | "CommonJS" | "UMD";
  format: ModuleFormat;
  ext: "mjs" | "cjs" | "js";
  output: {
    name: string;
    path: string;
  };
  bundle: {
    path: string;
  };
}

export function resolveBuildConfig(root: string) {
  const buildConfig: Record<Module, BuildInfo> = {
    esm: {
      module: "ESNext",
      format: "esm",
      ext: "mjs",
      output: {
        name: "es",
        path: path.resolve(root, "es"),
      },
      bundle: {
        path: `/es`,
      },
    },
    cjs: {
      module: "CommonJS",
      format: "cjs",
      ext: "js",
      output: {
        name: "lib",
        path: path.resolve(root, "lib"),
      },
      bundle: {
        path: `/lib`,
      },
    },
  };

  return Object.entries(buildConfig);
}

export function resolveInput(root: string, input: string): string[] {
  return globSync(`${normalizePath(path.resolve(root, input))}/**/*`, {
    onlyFiles: true,
    ignore: [
      "**/__tests__/**/*",
      "**/*.test.*",
      "**/*.spec.*",
      "**/*.stories.*",
      "**/*.d.*",
      "**/*.d.ts",
      "**/*.d.tsx",
      "**/*.mdx",
      "**/*.md",
      "**/demo/**",
      "**/design/**",
    ],
    absolute: true,
    caseSensitiveMatch: false,
  });
}

export function resolveTsConfig(root: string, tsconfig = "tsconfig.json") {
  let tsconfigPath = path.resolve(root, tsconfig);
  if (!fs.existsSync(tsconfigPath)) {
    console.log("tsconfig.json not found, use default tsconfig.json");
  }
  return tsconfigPath;
}

export const isWindows = os.platform() === "win32";

const windowsSlashRE = /\\/g;
export function slash(p: string): string {
  return p.replace(windowsSlashRE, "/");
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

// eslint-disable-next-line no-new-func
export const dynamicImport = new Function("file", "return import(file)");

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export type ValueTypes<T> = T[keyof T];

// 获取软连接地址
export function resolveSymbolicLink(id: string): string {
  return isWindows ? fs.readlinkSync(id) : fs.realpathSync.native(id);
}

export function tranformPath(id: string): URL {
  return new URL(`file:///${id}`);
}
