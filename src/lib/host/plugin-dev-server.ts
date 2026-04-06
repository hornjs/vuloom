import {
  createServer as createNodeServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { serve as createSevokServer } from "sevok";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import {
  createServer as createViteServer,
  mergeConfig,
  type InlineConfig,
  type Plugin,
  type PluginOption,
  type ViteDevServer,
} from "vite";
import { loadPhialConfig, type PhialConfig, type LoadPhialConfigOptions } from "../config/index.ts";
import { DEFAULT_CLIENT_ENTRY_PUBLIC_PATH, phialVitePlugin } from "../vite";

export interface PhialDevServerOptions extends LoadPhialConfigOptions {
  host?: string;
  port?: number;
  root?: string;
}

export interface PhialDevServerHandle {
  vite: ViteDevServer;
  server: Server;
  url: string;
  close(): Promise<void>;
}

interface PhialSourceEntryPoints {
  root?: string;
  plugin?: string;
}

const PHIAL_PACKAGE_ID = "phial";
const PHIAL_RUNTIME_PACKAGE_ID = "phial";
const INTERNAL_OPTIMIZE_DEPS_EXCLUDE = [PHIAL_PACKAGE_ID] as const;
const PHIAL_PACKAGE_ROOT = resolvePhialPackageRoot();
const PHIAL_SOURCE_ENTRY_POINTS = createPhialSourceEntryPoints();

export async function startPhialDevServer(
  options: PhialDevServerOptions = {},
): Promise<PhialDevServerHandle> {
  const loadedConfig = await loadPhialConfig({
    root: options.root,
    configFile: options.configFile,
    command: "serve",
    mode: options.mode,
    logLevel: options.logLevel,
  });
  const config = loadedConfig.config;
  const root = resolve(options.root ?? loadedConfig.configRoot);
  const host = options.host ?? config.dev?.host;
  const port = options.port ?? config.dev?.port ?? 3000;
  const server = createNodeServer();
  const vite = await createViteServer(
    createPhialViteInlineConfig(config, root, PHIAL_SOURCE_ENTRY_POINTS, server),
  );

  server.on("request", (req, res) => {
    void handleRequest(vite, req, res);
  });

  await new Promise<void>((resolveListen) => {
    server.listen(port, host, resolveListen);
  });

  return {
    vite,
    server,
    url: resolveDevServerUrl(server, host, port),
    async close() {
      await Promise.all([
        new Promise<void>((resolveClose, rejectClose) => {
          server.close((error) => {
            if (error) {
              rejectClose(error);
              return;
            }

            resolveClose();
          });
        }),
        vite.close(),
      ]);
    },
  };
}

export function createPhialViteInlineConfig(
  config: PhialConfig,
  root: string,
  sourceEntryPoints?: PhialSourceEntryPoints,
  hmrServer?: Server,
): InlineConfig {
  const vueFeatureFlags = {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
  };
  const routesPlugin = phialVitePlugin({
    ...config.plugin,
    root: config.plugin?.root ?? root,
  });
  const sourceRuntimePlugin = createPhialSourceRuntimePlugin(sourceEntryPoints);
  const userViteConfig = config.vite ?? {};
  const userOptimizeDeps = userViteConfig.optimizeDeps ?? {};
  const userPlugins = normalizePlugins(userViteConfig.plugins);
  const optimizeDepsExclude = mergeUniqueStrings(
    INTERNAL_OPTIMIZE_DEPS_EXCLUDE,
    userOptimizeDeps.exclude ?? [],
  );
  const mergedViteConfig = {
    ...userViteConfig,
    optimizeDeps: {
      ...userOptimizeDeps,
      exclude: optimizeDepsExclude,
      rolldownOptions: {
        ...userOptimizeDeps.rolldownOptions,
        transform: {
          ...userOptimizeDeps.rolldownOptions?.transform,
          define: {
            ...userOptimizeDeps.rolldownOptions?.transform?.define,
            ...Object.fromEntries(
              Object.entries(vueFeatureFlags).map(([key, value]) => [key, JSON.stringify(value)]),
            ),
          },
        },
      },
    },
  } satisfies InlineConfig;
  const baseConfig: InlineConfig = {
    root,
    appType: "custom",
    logLevel: "info",
    define: vueFeatureFlags,
    optimizeDeps: mergedViteConfig.optimizeDeps,
    server: {
      middlewareMode: true,
      hmr: hmrServer
        ? {
            server: hmrServer,
          }
        : undefined,
    },
    plugins: createDevServerPlugins({
      sourceRuntimePlugin,
      routesPlugin,
      userPlugins,
    }),
  };

  return mergeConfig(baseConfig, mergedViteConfig);
}

let cachedHandler: Awaited<ReturnType<typeof createDevRequestHandler>> | null = null;

async function handleRequest(
  vite: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    await new Promise<void>((resolveMiddleware, rejectMiddleware) => {
      vite.middlewares(req, res, (error?: Error) => {
        if (error) {
          rejectMiddleware(error);
          return;
        }

        resolveMiddleware();
      });
    });

    if (res.writableEnded) {
      return;
    }

    if (!cachedHandler) {
      cachedHandler = await createDevRequestHandler(vite, {
        clientEntryPath: DEFAULT_CLIENT_ENTRY_PUBLIC_PATH,
      });
    }

    const request = createNodeRequest(req);
    const response = await cachedHandler.fetch(request);

    await writeNodeResponse(res, response, req.method);
  } catch (error) {
    vite.ssrFixStacktrace(error as Error);
    res.statusCode = 500;
    res.end(error instanceof Error ? error.message : String(error));
  }
}

interface DevAppPluginModule {
  default?: (options?: { clientEntryPath?: string }) => (server: unknown) => void;
}

interface DevServerPluginModule {
  default?: () => (server: unknown) => void;
}

export async function createDevRequestHandler(
  vite: Pick<ViteDevServer, "ssrLoadModule">,
  options: {
    clientEntryPath?: string;
  } = {},
) {
  const appPluginModule = (await vite.ssrLoadModule(
    `${PHIAL_RUNTIME_PACKAGE_ID}/generated-app-plugin`,
  )) as DevAppPluginModule | undefined;
  const serverPluginModule = (await vite.ssrLoadModule(
    `${PHIAL_RUNTIME_PACKAGE_ID}/generated-server-plugin`,
  )) as DevServerPluginModule | undefined;

  return createSevokServer({
    manual: true,
    plugins: [
      serverPluginModule?.default?.() ?? (() => {}),
      appPluginModule?.default?.({
        clientEntryPath: options.clientEntryPath,
      }) ?? (() => {}),
    ],
    fetch: createNotFoundResponse,
  });
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", {
    status: 404,
  });
}

export function resolveDevServerUrl(
  server: Pick<Server, "address">,
  host: string | undefined,
  fallbackPort: number,
): string {
  const address = server.address();
  const publicHost =
    host && host !== "0.0.0.0" && host !== "::" && host !== "::1" ? host : "localhost";
  const resolvedPort =
    address && typeof address !== "string" ? (address as AddressInfo).port : fallbackPort;

  return `http://${publicHost}:${resolvedPort}`;
}

function createNodeRequest(req: IncomingMessage): Request {
  const origin = resolveRequestOrigin(req);
  const url = new URL(req.url ?? "/", origin);
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(name, entry);
      }
      continue;
    }

    if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const method = req.method ?? "GET";
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req) as never;
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function writeNodeResponse(
  res: ServerResponse,
  response: Response,
  requestMethod?: string,
): Promise<void> {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;

  response.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });

  if (requestMethod === "HEAD" || response.body === null) {
    res.end();
    return;
  }

  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  res.end();
}

function resolveRequestOrigin(req: IncomingMessage): string {
  const host = req.headers.host ?? "localhost";
  const protocol = isEncryptedRequest(req) ? "https" : "http";

  return `${protocol}://${host}`;
}

function isEncryptedRequest(req: IncomingMessage): boolean {
  return "encrypted" in req.socket && Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

function createPhialSourceEntryPoints(): PhialSourceEntryPoints {
  const entries = {
    root: resolve(PHIAL_PACKAGE_ROOT, "src/index.ts"),
    plugin: resolve(PHIAL_PACKAGE_ROOT, "src/vite.ts"),
  };

  return Object.fromEntries(Object.entries(entries).filter(([, file]) => existsSync(file)));
}

function createPhialSourceRuntimePlugin(
  sourceEntryPoints?: PhialSourceEntryPoints,
): Plugin | undefined {
  if (!sourceEntryPoints?.root) {
    return undefined;
  }

  return {
    name: "phial:source-runtime",
    enforce: "pre",
    resolveId(id, _importer, _options) {
      if (id === PHIAL_PACKAGE_ID) {
        return sourceEntryPoints?.root ?? null;
      }

      if (id === `${PHIAL_PACKAGE_ID}/vite` || id === `${PHIAL_PACKAGE_ID}/vite-plugin`) {
        return sourceEntryPoints?.plugin ?? null;
      }

      return null;
    },
  };
}

function resolvePhialPackageRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(currentDir, "../../../..");

  if (
    existsSync(resolve(packageRoot, "package.json")) &&
    existsSync(resolve(packageRoot, "src/index.ts")) &&
    existsSync(resolve(packageRoot, "src/vite.ts"))
  ) {
    return packageRoot;
  }

  return resolve(currentDir, "../../../..");
}

function hasPhialPlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "phial:routes",
  );
}

function hasVuePlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "vite:vue",
  );
}

function hasVueJsxPlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "vite:vue-jsx",
  );
}

function normalizePlugins(plugins: InlineConfig["plugins"]): PluginOption[] {
  if (!plugins) {
    return [];
  }

  return flattenPlugins(Array.isArray(plugins) ? plugins : [plugins]);
}

function createDevServerPlugins(options: {
  sourceRuntimePlugin?: Plugin;
  routesPlugin: Plugin;
  userPlugins: PluginOption[];
}): PluginOption[] {
  return [
    ...(options.sourceRuntimePlugin ? [options.sourceRuntimePlugin] : []),
    ...(hasVuePlugin(options.userPlugins) ? [] : [vue() as PluginOption]),
    ...(hasVueJsxPlugin(options.userPlugins) ? [] : [vueJsx() as PluginOption]),
    ...(hasPhialPlugin(options.userPlugins) ? [] : [options.routesPlugin]),
    ...options.userPlugins,
  ];
}

function flattenPlugins(plugins: readonly PluginOption[]): PluginOption[] {
  const flattened: PluginOption[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flattened.push(...flattenPlugins(plugin));
      continue;
    }

    flattened.push(plugin);
  }

  return flattened;
}

function mergeUniqueStrings(left: readonly string[], right: readonly string[]): string[] {
  return [...new Set([...left, ...right])];
}
