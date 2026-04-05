import type { ServerMiddleware, ServerPlugin } from "@hornjs/fest";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { AppModule, PageRouteRecord } from "../app-routes/types";

export interface CreateRouteRuntimeIntegrationOptions {
  app?: AppModule;
  routes: PageRouteRecord[];
  clientEntryPath?: string;
}

export interface RouteRuntimeIntegrationLike {
  match(pathname: string): unknown | null;
  handleRequest(request: Request): Promise<Response>;
}

export interface CreateAppRouteServerPluginOptions {
  app?: AppModule;
  routes: PageRouteRecord[];
  clientEntryPath?: string;
  createIntegration?: (
    options: CreateRouteRuntimeIntegrationOptions,
  ) => RouteRuntimeIntegrationLike | Promise<RouteRuntimeIntegrationLike>;
}

export function createAppRouteServerPlugin(
  options: CreateAppRouteServerPluginOptions,
): ServerPlugin {
  let integrationPromise: Promise<RouteRuntimeIntegrationLike> | undefined;

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

function createAppRouteMiddleware(
  _options: CreateAppRouteServerPluginOptions,
  getIntegration: () => Promise<RouteRuntimeIntegrationLike>,
): ServerMiddleware {
  return async (request, next) => {
    const integration = await getIntegration();
    const routeMatch = integration.match(new URL(request.url).pathname);
    if (!routeMatch) {
      return next(request);
    }

    return integration.handleRequest(request);
  };
}

async function loadDefaultIntegration(
  options: CreateRouteRuntimeIntegrationOptions,
): Promise<RouteRuntimeIntegrationLike> {
  const module = (await dynamicImport()) as {
    createRouteRuntimeIntegration: (
      options: CreateRouteRuntimeIntegrationOptions,
    ) => RouteRuntimeIntegrationLike;
  };
  const createRouteRuntimeIntegration = module.createRouteRuntimeIntegration as (
    options: CreateRouteRuntimeIntegrationOptions,
  ) => RouteRuntimeIntegrationLike;

  return createRouteRuntimeIntegration(options);
}

async function dynamicImport(): Promise<unknown> {
  const require = createRequire(import.meta.url);
  const integrationPath = require.resolve("vuepagelet/integration");

  return import(/* @vite-ignore */ pathToFileURL(integrationPath).href);
}
