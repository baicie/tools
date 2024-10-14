import cac from "cac";

import { server } from "./server";

const cli = cac("bee");
cli.command("[root]", "Build the project").action(() => {
  console.log("hello bee...");
});

cli
  .command("build", "build mode")
  .option("-w, --watch", "Production mode")
  .option("-c, --config", "Production mode")
  .option("-i, --input <input>", "input path")
  .option("-m, --minify", "output path")
  .option("-f, --full", "output path")
  .option("-s, --sourcemap", "output path")
  .option("-d, --dts", "output path")
  .option("-n, --name", "output path")
  .option("-v, --visualizer", "output path")
  .option("--ignore-error", "ignore ts error")
  .option("-a, --ant", "output path")
  .action(async (args) => {
    try {
      await server(args);
    } catch (error) {
      console.error(error);
    }
  });

cli.help();
cli.parse();
