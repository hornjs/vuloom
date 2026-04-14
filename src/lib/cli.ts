import { resolve } from "node:path";
import process from "node:process";
import {
  buildVuloomApp,
  prepareVuloomApp,
  startVuloomDevServer,
  startVuloomServer,
} from "./host";

export async function runVuloomCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = [...argv];
  const command = args.shift();

  if (!command) {
    printUsage();
    return 0;
  }

  if (command === "dev") {
    const options = parseSharedOptions(args);
    const handle = await startVuloomDevServer(options);

    console.log(`vuloom dev server: ${handle.url}`);
    registerShutdown(async () => {
      await handle.close();
      process.exit(0);
    });
    return 0;
  }

  if (command === "build") {
    const options = parseSharedOptions(args);
    await buildVuloomApp(options);
    return 0;
  }

  if (command === "prepare") {
    const options = parseSharedOptions(args);
    const result = await prepareVuloomApp(options);
    console.log(`vuloom prepare: wrote ${result.middlewareFile}`);
    return 0;
  }

  if (command === "start") {
    const options = parseSharedOptions(args);
    const handle = await startVuloomServer(options);

    console.log(`vuloom server: ${handle.url}`);
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
  const handler = () => {
    void shutdown();
  };

  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);
}

function printUsage() {
  console.log("Usage: vuloom <command> [root] [--config vuloom.config.ts] [--mode production]");
  console.log("");
  console.log("Commands:");
  console.log("  vuloom dev [root] [--port 3000] [--host 0.0.0.0] [--config vuloom.config.ts]");
  console.log("  vuloom build [root] [--watch] [--config vuloom.config.ts] [--mode production]");
  console.log("  vuloom prepare [root] [--config vuloom.config.ts] [--mode development]");
  console.log(
    "  vuloom start [root] [--port 3000] [--host 0.0.0.0] [--config vuloom.config.ts] [--mode production]",
  );
}
