import { resolve } from "node:path";
import process from "node:process";
import {
  buildHornApp,
  prepareHornApp,
  startHornDevServer,
  startHornServer,
} from "../vite-plugin/host";

export async function runPhialCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = [...argv];
  const command = args.shift();

  if (!command) {
    printUsage();
    return 0;
  }

  if (command === "dev") {
    const options = parseSharedOptions(args);
    const handle = await startHornDevServer(options);

    console.log(`phial dev server: ${handle.url}`);
    registerShutdown(async () => {
      await handle.close();
      process.exit(0);
    });
    return 0;
  }

  if (command === "build") {
    const options = parseSharedOptions(args);
    await buildHornApp(options);
    return 0;
  }

  if (command === "prepare") {
    const options = parseSharedOptions(args);
    const result = await prepareHornApp(options);
    console.log(`phial prepare: wrote ${result.middlewareFile}`);
    return 0;
  }

  if (command === "start") {
    const options = parseSharedOptions(args);
    const handle = await startHornServer(options);

    console.log(`phial server: ${handle.url}`);
    registerShutdown(async () => {
      await handle.close();
      process.exit(0);
    });
    return 0;
  }

  printUsage();
  return 1;
}

function parseSharedOptions(argv: string[]) {
  const options: Record<string, unknown> = {};

  while (argv.length > 0) {
    const token = argv.shift();

    if (!token) {
      continue;
    }

    if (!token.startsWith("--") && !options.root) {
      options.root = resolve(token);
      continue;
    }

    if (token === "--host") {
      options.host = argv.shift();
      continue;
    }

    if (token === "--port") {
      const value = argv.shift();
      if (value) {
        options.port = Number(value);
      }
      continue;
    }

    if (token === "--config") {
      const value = argv.shift();
      if (value) {
        options.configFile = value;
      }
      continue;
    }

    if (token === "--mode") {
      const value = argv.shift();
      if (value) {
        options.mode = value;
      }
      continue;
    }

    if (token === "--watch") {
      options.watch = true;
      continue;
    }
  }

  return options;
}

function registerShutdown(shutdown: () => Promise<void>) {
  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

function printUsage() {
  console.log("Usage: phial <command> [root] [--config phial.config.ts] [--mode production]");
  console.log("");
  console.log("Commands:");
  console.log("  phial dev [root] [--port 3000] [--host 0.0.0.0] [--config phial.config.ts]");
  console.log("  phial build [root] [--watch] [--config phial.config.ts] [--mode production]");
  console.log("  phial prepare [root] [--config phial.config.ts] [--mode development]");
  console.log(
    "  phial start [root] [--port 3000] [--host 0.0.0.0] [--config phial.config.ts] [--mode production]",
  );
}
