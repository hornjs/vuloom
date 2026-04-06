import { basename, extname, relative, resolve } from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import type { PhialPluginOptions } from "../config";
import { isPhialConfigFile, loadPhialConfig, type LoadedPhialConfig } from "../config";
import { createClientEntryModule } from "./generated/client-entry";
import { scanRoutes } from "./scanners/routes-scanner";
import type { ScannedRoutesResult } from "./scanners/route-manifest";
import { writePhialProjectTypes } from "./scanners/types-generator";
import {
  createVirtualAppLoaderModule,
  createVirtualAppMiddlewareModule,
  createVirtualAppPluginModule,
  createVirtualAppRuntimeModule,
  createVirtualServerPluginModule,
  createVirtualServerMiddlewareModule,
  createVirtualServerRoutesModule,
  createVirtualConfigModule,
  RESOLVED_GENERATED_APP_LOADER_ID,
  RESOLVED_GENERATED_APP_MIDDLEWARE_ID,
  RESOLVED_GENERATED_APP_PLUGIN_ID,
  RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID,
  RESOLVED_GENERATED_SERVER_PLUGIN_ID,
  RESOLVED_GENERATED_SERVER_ROUTES_ID,
  RESOLVED_GENERATED_CONFIG_ID,
  RESOLVED_GENERATED_APP_RUNTIME_ID,
  createVirtualRoutesManifestModule,
  createVirtualRoutesModulesModule,
  RESOLVED_GENERATED_ROUTES_MANIFEST_ID,
  RESOLVED_GENERATED_ROUTES_MODULES_ID,
  RESOLVED_VIRTUAL_APP_RUNTIME_ID,
  RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID,
  RESOLVED_VIRTUAL_ROUTES_MODULES_ID,
  resolveVirtualModuleId,
} from "./generated/virtual-modules";

export interface PhialVitePluginOptions extends PhialPluginOptions {}
export const DEFAULT_CLIENT_ENTRY_PUBLIC_PATH = "/@phial/client-entry.js";

export function phialVitePlugin(options: PhialVitePluginOptions = {}): Plugin {
  let viteConfig: ResolvedConfig | null = null;
  let scannedRoutesPromise: Promise<ScannedRoutesResult> | null = null;
  let phialConfigPromise: Promise<LoadedPhialConfig> | null = null;
  let watcherReady = false;
  let refreshPromise: Promise<void> | null = null;
  let refreshRequested = false;
  let refreshNeedsConfigReload = false;
  let refreshNeedsFullReload = false;

  return {
    name: "phial:routes",
    enforce: "pre",
    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
      scannedRoutesPromise = null;
      phialConfigPromise = null;
    },
    async buildStart() {
      await Promise.all([getScannedRoutes(), getPhialConfig()]);
    },
    resolveId(id) {
      return resolveVirtualModuleId(id);
    },
    async load(id) {
      const resolvedId = resolveVirtualModuleId(id);
      if (!resolvedId) {
        return null;
      }

      if (resolvedId === RESOLVED_GENERATED_CONFIG_ID) {
        const phialConfig = await getPhialConfig();

        return createVirtualConfigModule({
          config: phialConfig.config as Record<string, unknown>,
          hasConfigFile: Boolean(phialConfig.file),
        });
      }

      const scannedRoutes = await getScannedRoutes();

      if (resolvedId === RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID) {
        return createVirtualRoutesManifestModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_VIRTUAL_ROUTES_MODULES_ID) {
        return createVirtualRoutesModulesModule(scannedRoutes, {
          moduleImportMode: options.moduleImportMode === "dynamic" ? "lazy" : "eager",
        });
      }

      if (resolvedId === RESOLVED_VIRTUAL_APP_RUNTIME_ID) {
        return createVirtualAppRuntimeModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_ROUTES_MANIFEST_ID) {
        return createVirtualRoutesManifestModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_ROUTES_MODULES_ID) {
        return createVirtualRoutesModulesModule(scannedRoutes, {
          moduleImportMode: "eager",
        });
      }

      if (resolvedId === RESOLVED_GENERATED_APP_RUNTIME_ID) {
        return createVirtualAppRuntimeModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_APP_LOADER_ID) {
        return createVirtualAppLoaderModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_APP_MIDDLEWARE_ID) {
        return createVirtualAppMiddlewareModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_APP_PLUGIN_ID) {
        return createVirtualAppPluginModule();
      }

      if (resolvedId === RESOLVED_GENERATED_SERVER_ROUTES_ID) {
        return createVirtualServerRoutesModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID) {
        return createVirtualServerMiddlewareModule(scannedRoutes);
      }

      if (resolvedId === RESOLVED_GENERATED_SERVER_PLUGIN_ID) {
        return createVirtualServerPluginModule();
      }

      return null;
    },
    configureServer(server) {
      const scheduleRefresh = (options: { configReload?: boolean; fullReload?: boolean }) => {
        refreshRequested = true;
        refreshNeedsConfigReload ||= options.configReload === true;
        refreshNeedsFullReload ||= options.fullReload === true;

        if (refreshPromise) {
          return refreshPromise;
        }

        refreshPromise = (async () => {
          while (refreshRequested) {
            refreshRequested = false;
            const reloadConfig = refreshNeedsConfigReload;
            const reloadFullPage = refreshNeedsFullReload;
            refreshNeedsConfigReload = false;
            refreshNeedsFullReload = false;

            scannedRoutesPromise = null;
            if (reloadConfig) {
              phialConfigPromise = null;
            }

            await getPhialConfig();
            await getScannedRoutes();
            invalidateVirtualModules(server);

            if (reloadFullPage) {
              sendFullReload(server);
            }
          }
        })().finally(() => {
          refreshPromise = null;
        });

        return refreshPromise;
      };

      const handleStructureChange = async (file: string) => {
        if (!watcherReady) {
          return;
        }

        const scannedAppFile = await isScannedAppFile(file);
        const scannedServerFile = await isScannedServerFile(file);
        const phialConfigFile = isPhialConfigFile(file);

        if (!scannedAppFile && !scannedServerFile && !phialConfigFile) {
          return;
        }

        await scheduleRefresh({
          configReload: phialConfigFile,
          fullReload: scannedAppFile || phialConfigFile,
        });
      };

      const handleConfigChange = async (file: string) => {
        if (!watcherReady || !isPhialConfigFile(file)) {
          return;
        }

        await scheduleRefresh({
          configReload: true,
          fullReload: true,
        });
      };

      server.watcher.on("ready", () => {
        watcherReady = true;
      });
      server.watcher.on("add", (file) => {
        void handleStructureChange(file);
      });
      server.watcher.on("unlink", (file) => {
        void handleStructureChange(file);
      });
      server.watcher.on("change", (file) => {
        void handleConfigChange(file);
      });

      server.middlewares.use(async (req, res, next) => {
        const requestPath = req.url?.split("?")[0];
        if (requestPath !== DEFAULT_CLIENT_ENTRY_PUBLIC_PATH) {
          next();
          return;
        }

        const source = createClientEntryModule();

        res.setHeader("content-type", "application/javascript; charset=utf-8");
        res.end(source);
      });
    },
  };

  async function getScannedRoutes(): Promise<ScannedRoutesResult> {
    const resolvedOptions = await getResolvedOptions();

    scannedRoutesPromise ??= scanRoutes({
      root: resolvedOptions.root ?? viteConfig?.root,
      appDir: resolvedOptions.appDir,
      routesDir: resolvedOptions.routesDir,
      serverRoutesDir: resolvedOptions.serverRoutesDir,
      serverMiddlewareDir: resolvedOptions.serverMiddlewareDir,
      extensions: resolvedOptions.extensions,
    }).then(async (result) => {
      await writePhialProjectTypes(result);
      return result;
    });

    return scannedRoutesPromise;
  }

  async function getPhialConfig(): Promise<LoadedPhialConfig> {
    phialConfigPromise ??= loadPhialConfig({
      root: options.root ?? viteConfig?.root,
      command: viteConfig?.command ?? "serve",
      mode: viteConfig?.mode,
      isSsrBuild: Boolean(viteConfig?.build?.ssr),
      isPreview: false,
      logLevel: viteConfig?.logLevel,
    });

    return phialConfigPromise;
  }

  async function getResolvedOptions(): Promise<PhialVitePluginOptions> {
    const phialConfig = await getPhialConfig();
    const configuredOptions = phialConfig.config.plugin ?? {};
    const appDir = options.appDir ?? configuredOptions.appDir ?? "app";

    return {
      ...configuredOptions,
      ...options,
      root: options.root ?? configuredOptions.root ?? phialConfig.configRoot,
      appDir,
      routesDir: options.routesDir ?? configuredOptions.routesDir ?? `${appDir}/pages`,
      serverRoutesDir:
        options.serverRoutesDir ?? configuredOptions.serverRoutesDir ?? "server/routes",
      serverMiddlewareDir:
        options.serverMiddlewareDir ?? configuredOptions.serverMiddlewareDir ?? "server/middleware",
    };
  }

  async function isScannedAppFile(file: string): Promise<boolean> {
    const resolvedOptions = await getResolvedOptions();
    const root = resolve(resolvedOptions.root ?? viteConfig?.root ?? process.cwd());
    const appDir = resolve(root, resolvedOptions.appDir ?? "app");
    const middlewareDir = resolve(appDir, "middleware");
    const configuredRoutesDir =
      resolvedOptions.routesDir ?? `${resolvedOptions.appDir ?? "app"}/pages`;
    const configuredExtensions = resolvedOptions.extensions;
    const routesDir = resolve(root, configuredRoutesDir);
    const absoluteFile = resolve(file);
    const relativeToAppDir = normalizePath(relative(appDir, absoluteFile));
    const relativeToMiddlewareDir = normalizePath(relative(middlewareDir, absoluteFile));
    const relativeToRoot = normalizePath(relative(root, absoluteFile));
    const relativePath = normalizePath(relative(routesDir, resolve(file)));
    const extension = extname(relativePath);
    const normalizedExtensions = normalizeExtensions(configuredExtensions);

    if (!relativeToAppDir.startsWith("../")) {
      if (
        relativeToAppDir.startsWith("app.config.") &&
        normalizedExtensions.includes(extname(relativeToAppDir))
      ) {
        return true;
      }

      const appFileExtension = extname(relativeToAppDir);
      const appFileName = basename(relativeToAppDir, appFileExtension);
      if (
        normalizedExtensions.includes(appFileExtension) &&
        (appFileName === "app" || appFileName === "error" || appFileName === "loader")
      ) {
        return true;
      }
    }

    if (
      !relativeToMiddlewareDir.startsWith("../") &&
      normalizedExtensions.includes(extname(relativeToMiddlewareDir))
    ) {
      return true;
    }

    if (
      !relativeToRoot.startsWith("../") &&
      relativeToRoot.startsWith("app.config.") &&
      normalizedExtensions.includes(extname(relativeToRoot))
    ) {
      return true;
    }

    if (!relativePath || relativePath.startsWith("../")) {
      return false;
    }

    if (!normalizedExtensions.includes(extension)) {
      return false;
    }

    const fileName = basename(relativePath, extension);
    return [
      "layout",
      "page",
      "error",
      "loading",
      "action",
      "loader",
      "middleware",
      "_middleware",
    ].includes(fileName);
  }

  async function isScannedServerFile(file: string): Promise<boolean> {
    const resolvedOptions = await getResolvedOptions();
    const root = resolve(resolvedOptions.root ?? viteConfig?.root ?? process.cwd());
    const serverRoutesDir = resolve(root, resolvedOptions.serverRoutesDir ?? "server/routes");
    const serverMiddlewareDir = resolve(
      root,
      resolvedOptions.serverMiddlewareDir ?? "server/middleware",
    );
    const absoluteFile = resolve(file);
    const relativeToRoutesDir = normalizePath(relative(serverRoutesDir, absoluteFile));
    const relativeToMiddlewareDir = normalizePath(relative(serverMiddlewareDir, absoluteFile));
    const normalizedExtensions = normalizeExtensions(resolvedOptions.extensions).filter(
      (extension) => extension !== ".vue",
    );

    return (
      (!relativeToRoutesDir.startsWith("../") &&
        normalizedExtensions.includes(extname(relativeToRoutesDir))) ||
      (!relativeToMiddlewareDir.startsWith("../") &&
        normalizedExtensions.includes(extname(relativeToMiddlewareDir)))
    );
  }
}

function invalidateVirtualModules(server: ViteDevServer): void {
  invalidateVirtualModule(server, RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID);
  invalidateVirtualModule(server, RESOLVED_VIRTUAL_ROUTES_MODULES_ID);
  invalidateVirtualModule(server, RESOLVED_VIRTUAL_APP_RUNTIME_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_ROUTES_MANIFEST_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_ROUTES_MODULES_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_APP_RUNTIME_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_APP_LOADER_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_APP_MIDDLEWARE_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_APP_PLUGIN_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_SERVER_ROUTES_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_SERVER_PLUGIN_ID);
  invalidateVirtualModule(server, RESOLVED_GENERATED_CONFIG_ID);
}

function sendFullReload(server: ViteDevServer): void {
  const clientEnvironment = server.environments.client;
  if (clientEnvironment) {
    clientEnvironment.hot.send({
      type: "full-reload",
      path: "*",
    });
    return;
  }

  server.ws.send({
    type: "full-reload",
    path: "*",
  });
}

function invalidateVirtualModule(server: ViteDevServer, id: string): void {
  const module = server.moduleGraph.getModuleById(id);
  if (module) {
    server.moduleGraph.invalidateModule(module, new Set(), Date.now(), true);
  }
}

function normalizeExtensions(extensions?: string[]): string[] {
  const resolved = extensions?.length ? extensions : [".vue", ".ts", ".js", ".tsx", ".jsx"];
  return Array.from(
    new Set(resolved.map((extension) => (extension.startsWith(".") ? extension : `.${extension}`))),
  );
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}
