import type { ServerMiddlewareFunction, ServerPlugin } from "sevok";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type {
  AppModule,
  PageRouteRecord,
  RouteRuntimeIntegration,
} from "vuepagelet/integration";

/**
 * Options for creating the app routes server plugin.
 * Aligns with vuepagelet's route runtime integration options.
 */
export interface CreateAppRouteServerPluginOptions {
  /** App-level configuration (shell, error boundary, etc.) */
  app?: AppModule;
  /** Route records to be handled by the app */
  routes: PageRouteRecord[];
  /** Path to client entry for SSR */
  clientEntryPath?: string;
  /** Custom integration factory - defaults to vuepagelet's createRouteRuntimeIntegration */
  createIntegration?: (
    options: CreateAppRouteServerPluginOptions,
  ) => RouteRuntimeIntegration | Promise<RouteRuntimeIntegration>;
}

/**
 * Creates a sevok server plugin that handles app (page) routes.
 * Integrates vuepagelet's route runtime with sevok's server.
 */
export function createAppRouteServerPlugin(
  options: CreateAppRouteServerPluginOptions,
): ServerPlugin {
  let integrationPromise: Promise<RouteRuntimeIntegration> | undefined;

  return (server) => {
    server.options.middleware.push(
      createAppRouteMiddleware(options, () => {
        if (!integrationPromise) {
          integrationPromise = Promise.resolve(
            options.createIntegration?.(options) ?? loadDefaultIntegration(options),
          );
        }

        return integrationPromise;
      }),
    );
  };
}

/**
 * Creates middleware that routes requests to the vuepagelet integration.
 */
function createAppRouteMiddleware(
  _options: CreateAppRouteServerPluginOptions,
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
  options: CreateAppRouteServerPluginOptions,
): Promise<RouteRuntimeIntegration> {
  const module = (await dynamicImport()) as {
    createRouteRuntimeIntegration: (options: CreateAppRouteServerPluginOptions) => RouteRuntimeIntegration;
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
