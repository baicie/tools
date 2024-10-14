import path from "node:path";
import fs from "node:fs";
import type { NormalizedPackageJson } from "read-pkg";
import { readPackageSync } from "read-pkg";
import type { InnerConfigExport } from "./config";
import { isWindows, normalizePath } from "./utils";
import { bareImportRE } from "./constants";

export function resolveId(root: string, id: string, config: InnerConfigExport) {
  let res = id;
  if (id.startsWith("/")) res = path.join(root, id);

  if (id.startsWith(".")) {
    const basePath = path.dirname(id);
    res = normalizePath(path.join(basePath, id));
  }

  if (bareImportRE.test(id)) res = resolveBareImportId(root, id, config);

  return normalizePath(res);
}

// 返回最终地址
function resolveBareImportId(
  root: string,
  id: string,
  config: InnerConfigExport
) {
  const { pkgData, pkgPath = "" } = resolvePackageData(root, id);

  let module = "";

  if (pkgData?.module) {
    module = pkgData?.module;
  } else if (pkgData?.exports) {
    // module = pkgData.exports['.'].default
  }

  const res = path.resolve(pkgPath, module);

  return res;
}

// 加载packagedata
function resolvePackageData(
  root: string,
  id: string
): {
  pkgData: undefined | NormalizedPackageJson;
  pkgPath: string;
} {
  let basedir = root;
  while (basedir) {
    // 获取地址
    const dir = path.join(basedir, "node_modules", id);

    if (fs.existsSync(dir)) {
      // 是否是软连接
      const isLink = fs.lstatSync(dir).isSymbolicLink();
      const pkgPath = isLink ? resolveSymbolicLink(dir) : dir;
      // 读取内容
      const res = readPackageSync({ cwd: pkgPath });

      return {
        pkgData: res,
        pkgPath,
      };
    } else {
      basedir = path.dirname(basedir);
    }
  }

  return {
    pkgData: undefined,
    pkgPath: "",
  };
}

// 获取软连接地址
function resolveSymbolicLink(id: string): string {
  return isWindows ? fs.readlinkSync(id) : fs.realpathSync.native(id);
}
