import { relative, resolve } from "node:path";
import { scanAppRuntime } from "./app-runtime-scanner";
import { scanAppPageRoutes } from "./app-pages-scanner";
import { createRouteManifest, type ScannedRoutesResult } from "./route-manifest";
import {
  assertServerRouteConflicts,
  DEFAULT_APP_DIR,
  DEFAULT_SERVER_MIDDLEWARE_DIR,
  DEFAULT_SERVER_ROUTES_DIR,
  exists,
  normalizeExtensions,
  toPosixPath,
} from "./scanner-utils";
import { scanServerMiddlewareFiles, scanServerRoutes } from "./server-routes-scanner";

export interface RouteScannerOptions {
  root?: string;
  appDir?: string;
  routesDir?: string;
  serverRoutesDir?: string;
  serverMiddlewareDir?: string;
  extensions?: string[];
}

export async function scanRoutes(options: RouteScannerOptions = {}): Promise<ScannedRoutesResult> {
  const root = resolve(options.root ?? process.cwd());
  const appDir = resolve(root, options.appDir ?? DEFAULT_APP_DIR);
  const routesDir = resolve(
    root,
    options.routesDir ?? `${options.appDir ?? DEFAULT_APP_DIR}/pages`,
  );
  const serverRoutesDir = resolve(root, options.serverRoutesDir ?? DEFAULT_SERVER_ROUTES_DIR);
  const serverMiddlewareDir = resolve(
    root,
    options.serverMiddlewareDir ?? DEFAULT_SERVER_MIDDLEWARE_DIR,
  );
  const extensions = normalizeExtensions(options.extensions);
  const serverExtensions = extensions.filter((extension) => extension !== ".vue");
  const app = await scanAppRuntime({
    root,
    appDir,
    extensions,
  });
  const serverRoutes = await scanServerRoutes({
    root,
    routesDir: serverRoutesDir,
    extensions: serverExtensions,
  });
  const serverMiddleware = await scanServerMiddlewareFiles({
    root,
    middlewareDir: serverMiddlewareDir,
    extensions: serverExtensions,
  });
  const server = {
    routesDir: toPosixPath(relative(root, serverRoutesDir)),
    middlewareDir: toPosixPath(relative(root, serverMiddlewareDir)),
    routes: serverRoutes,
    middleware: serverMiddleware,
  };

  if (!(await exists(routesDir))) {
    assertServerRouteConflicts([], server.routes);
    return {
      root,
      appDir,
      routesDir,
      serverRoutesDir,
      serverMiddlewareDir,
      app,
      server,
      modules: [],
      manifest: [],
    };
  }

  const modules = await scanAppPageRoutes({
    root,
    routesDir,
    extensions,
  });
  assertServerRouteConflicts(modules, server.routes);

  return {
    root,
    appDir,
    routesDir,
    serverRoutesDir,
    serverMiddlewareDir,
    app,
    server,
    modules,
    manifest: createRouteManifest(modules),
  };
}
