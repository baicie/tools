import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

// 获取项目的 package.json 文件
const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url)).toString()
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// 定义打包配置
export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  outDir: "./dist/types", // 输出目录
  format: ["esm"],
  splitting: true,
  sourcemap: true,
  external: ["fsevents", ...Object.keys(pkg.dependencies)], // 标记外部依赖
  dts: {
    only: true,
  },
  clean: true,
  esbuildOptions(options) {
    // 自定义 esbuild 配置
    options.target = "node18"; // 设置目标环境为 Node.js 18
    options.tsconfig = path.resolve(__dirname, "tsconfig.json"); // 指定 tsconfig 文件路径
  },
  onSuccess: "echo Build completed", // 打包成功后的提示
});
