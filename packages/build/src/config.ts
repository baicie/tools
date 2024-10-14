import { init as importInit, parse as importParse } from "es-module-lexer";
import MagicStr from "magic-string";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "rollup";
import { CONFIGFILE } from "./constants";
import { Logger, createLogger } from "../../commitizen/src/logger";
import { defaultPlugin } from "../../commitizen/src/plugins/default";
import { transformTypeScript } from "../../commitizen/src/transform";
import {
  dynamicImport,
  isObject,
  tranformPath,
} from "../../commitizen/src/utils";
import { resolveId } from "./resolve";
import { InlineOptions } from "./server";

// file config
export interface UserConfigExport {
  /**
   * 一些设置
   */
  options: InlineOptions;
  /**
   * 简单的插件实现
   */
  plugins?: Plugin[];
}

export interface InnerConfigExport {
  logger: Logger;
}

export type ConfigExport = UserConfigExport & InnerConfigExport;

//  inline config
export async function resolveConfig(
  root: string,
  inlineConfig: InlineOptions = {}
) {
  const config: ConfigExport = {
    options: inlineConfig,
    logger: createLogger(),
  };

  const fileConfig = await resolveConfigFile(root, config);

  let merge = mergeConfigs(config, fileConfig ?? {}) as ConfigExport;

  merge = setDefaultConfig(merge);

  return merge;
}

function setDefaultConfig(config: ConfigExport) {
  // add default plugins
  if (!config.plugins) config.plugins = [];

  if (config.plugins && Array.isArray(config.plugins)) {
    config.plugins.push(defaultPlugin());
  }
  return config;
}

async function resolveConfigFile(
  root: string,
  config: InnerConfigExport
): Promise<UserConfigExport | undefined> {
  const logger = config.logger;
  try {
    let filePath: string | undefined;
    let raw: string | undefined;

    if (root) {
      filePath = path.resolve(root, CONFIGFILE);
      raw = fs.readFileSync(filePath, { encoding: "utf8" });
    } else {
      raw = "";
      logger.warn(`config file not found with path: ${root}`);
    }

    const code = await resolveConfigAndTransform(root, raw, config);

    const userConfig = (
      await dynamicImport(
        `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
      )
    ).default;

    return userConfig;
  } catch (error) {
    logger.error(error);
  }
}

async function resolveConfigAndTransform(
  root: string,
  raw: string,
  config: InnerConfigExport
) {
  await importInit;

  const js = await transformTypeScript(raw);

  const magicstr = new MagicStr(js);

  const [imports] = importParse(js);

  imports.forEach((imp) => {
    if (imp.n) {
      let resultPath = resolveId(root, imp.n, config);

      resultPath = tranformPath(resultPath).toString();

      magicstr.overwrite(imp.s, imp.e, resultPath, { contentOnly: true });
    }
  });
  return magicstr.toString();
}

function mergeConfigs(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath = ""
) {
  const merged: Record<string, any> = { ...defaults };

  for (const key in overrides) {
    const value = overrides[key];
    if (value == null) continue;

    const existing = merged[key];
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigs(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key
      );
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config;
}
