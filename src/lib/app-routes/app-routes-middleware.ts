import type { ServerMiddlewareFunction } from "sevok";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type {
  AppModule,
  PageRouteRecord,
  RouteRuntimeIntegration,
} from "vuepagelet/integration";

/**
 * Options for creating the app routes server middleware.
 * Aligns with vuepagelet's route runtime integration options.
 */
export interface CreateAppRouteMiddlewareOptions {
  /** App-level configuration (shell, error boundary, etc.) */
  app?: AppModule;
  /** Route records to be handled by the app */
  routes: PageRouteRecord[];
  /** Path to client entry for SSR */
  clientEntryPath?: string;
  /** Custom integration factory - defaults to vuepagelet's createRouteRuntimeIntegration */
  createIntegration?: (
    options: CreateAppRouteMiddlewareOptions,
  ) => RouteRuntimeIntegration | Promise<RouteRuntimeIntegration>;
}

/**
 * Creates a sevok server middleware that handles app (page) routes.
 * Integrates vuepagelet's route runtime with sevok's server.
 */
export function createAppRouteMiddleware(
  options: CreateAppRouteMiddlewareOptions,
): ServerMiddlewareFunction {
  let integrationPromise: Promise<RouteRuntimeIntegration> | undefined;

  return createAppRouteMiddlewareHandler(options, () => {
    if (!integrationPromise) {
      integrationPromise = Promise.resolve(
        options.createIntegration?.(options) ?? loadDefaultIntegration(options),
      );
    }

    return integrationPromise;
  });
}

/**
 * Creates middleware handler that routes requests to the vuepagelet integration.
 */
function createAppRouteMiddlewareHandler(
  _options: CreateAppRouteMiddlewareOptions,
  getIntegration: () => Promise<RouteRuntimeIntegration>,
): ServerMiddlewareFunction {
  return async (context, next) => {
    const request = context.request;
    const integration = await getIntegration();
    const routeMatch = integration.match(new URL(request.url).pathname);

    if (!routeMatch) {
      return next(context);
    }

    return integration.handleRequest(request);
  };
}

/**
 * Loads the default vuepagelet route runtime integration.
 */
async function loadDefaultIntegration(
  options: CreateAppRouteMiddlewareOptions,
): Promise<RouteRuntimeIntegration> {
  const module = (await dynamicImport()) as {
    createRouteRuntimeIntegration: (options: CreateAppRouteMiddlewareOptions) => RouteRuntimeIntegration;
  };

  return module.createRouteRuntimeIntegration(options);
}

/**
 * Dynamic import of vuepagelet/integration for SSR compatibility.
 */
async function dynamicImport(): Promise<unknown> {
  const require = createRequire(import.meta.url);
  const integrationPath = require.resolve("vuepagelet/integration");

  return import(/* @vite-ignore */ pathToFileURL(integrationPath).href);
}
