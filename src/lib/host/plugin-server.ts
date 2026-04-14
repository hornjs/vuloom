import { type RuntimeAdapter, type Server } from "sevok";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_CLIENT_BUILD_OUT_DIR, DEFAULT_SERVER_BUILD_OUT_DIR } from "./plugin-build";
import { loadVuloomConfig, type LoadVuloomConfigOptions } from "../config";

export interface VuloomStartServerOptions extends LoadVuloomConfigOptions {
  host?: string;
  port?: number;
  root?: string;
  adapter?: RuntimeAdapter;
}

export interface VuloomStartServerHandle {
  server: Server;
  url: string;
  close(): Promise<void>;
}

export async function startVuloomServer(
  options: VuloomStartServerOptions = {},
): Promise<VuloomStartServerHandle> {
  const loadedConfig = await loadVuloomConfig({
    root: options.root,
    configFile: options.configFile,
    command: "serve",
    mode: options.mode ?? "production",
    isSsrBuild: false,
    isPreview: false,
    logLevel: "info",
  });
  const root = resolve(options.root ?? loadedConfig.configRoot);
  const host = options.host ?? loadedConfig.config.dev?.host;
  const port = options.port ?? loadedConfig.config.dev?.port ?? 3000;
  const clientOutDir = resolve(
    root,
    loadedConfig.config.vite?.build?.outDir ?? DEFAULT_CLIENT_BUILD_OUT_DIR,
  );
  const serverEntry = resolve(root, DEFAULT_SERVER_BUILD_OUT_DIR, "index.js");
  const clientEntryPath = await resolveBuiltClientEntryPath(clientOutDir);
  const serverModule = await import(/* @vite-ignore */ pathToFileURL(serverEntry).href);
  const createServerApp = resolveCreateServerApp(serverModule);
  const app = await createServerApp({
    adapter: options.adapter,
    clientEntryPath,
    publicDir: clientOutDir,
    hostname: host,
    port,
  });
  await app.ready();

  const publicHost = host && host !== "0.0.0.0" ? host : "localhost";

  return {
    server: app,
    url: app.url ?? `http://${publicHost}:${port}`,
    async close() {
      await app.close();
    },
  };
}

type CreateServerApp = (options?: {
  adapter?: RuntimeAdapter;
  clientEntryPath?: string;
  publicDir?: string;
  hostname?: string;
  port?: number;
  manual?: boolean;
}) => Server | Promise<Server>;

async function resolveBuiltClientEntryPath(clientOutDir: string): Promise<string> {
  const manifestFile = resolve(clientOutDir, ".vite/manifest.json");
  const manifestSource = await readFile(manifestFile, "utf8").catch(() => null);

  if (!manifestSource) {
    throw new Error(`Missing Vuloom build manifest: ${manifestFile}. Run "vuloom build" first.`);
  }

  const manifest = JSON.parse(manifestSource) as Record<
    string,
    {
      file?: string;
      isEntry?: boolean;
      name?: string;
      src?: string;
    }
  >;
  const clientEntry = Object.values(manifest).find(
    (entry) =>
      entry.isEntry &&
      (entry.name === "client-entry" || entry.src?.includes("virtual:vuloom-client-entry")),
  );

  if (!clientEntry?.file) {
    throw new Error(`Unable to resolve Vuloom client entry from manifest: ${manifestFile}`);
  }

  return `/${clientEntry.file}`;
}

function resolveCreateServerApp(serverModule: Record<string, unknown>): CreateServerApp {
  const candidate = serverModule.createServerApp ?? serverModule.default;

  if (typeof candidate !== "function") {
    throw new Error(
      `Invalid Vuloom server bundle. Expected a createServerApp export in ${DEFAULT_SERVER_BUILD_OUT_DIR}/index.js.`,
    );
  }

  return candidate as CreateServerApp;
}
