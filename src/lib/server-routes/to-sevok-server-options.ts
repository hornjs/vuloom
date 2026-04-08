import type {
  ServerHandler,
  ServerHandlerFunction,
  ServerMiddleware,
  ServerMiddlewareFunction,
  ServerMiddlewareResolver,
  RoutingOptions,
  ServerRoutes,
} from "sevok";
import type { ServerRouteRecord } from "./types";

export interface ToSevokServerOptionsOptions {
  routes: ServerRouteRecord[];
  middlewareRegistry: Record<string, ServerMiddleware>;
  globalMiddlewareNames?: readonly string[];
  /**
   * Fallback handler when no route matches.
   * If not provided, unmatched requests will return 404.
   */
  fallback?: ServerHandlerFunction;
}

/**
 * Convert phial server routes to sevok RoutingOptions.
 *
 * This allows phial routes to be used directly with sevok's Server,
 * leveraging sevok's built-in routing, middleware resolution, and handler invocation.
 *
 * @example
 * ```ts
 * import { Server } from "sevok";
 * import { toSevokServerOptions } from "phial/server-routes";
 *
 * const server = new Server({
 *   ...toSevokServerOptions({ routes, middlewareRegistry }),
 *   port: 3000,
 * });
 * ```
 */
export function toSevokServerOptions(
  options: ToSevokServerOptionsOptions,
): Omit<RoutingOptions, "error"> {
  const { routes, middlewareRegistry, globalMiddlewareNames, fallback } = options;

  // Convert phial routes to sevok ServerRoutes
  const serverRoutes = convertRoutesToSevok(routes);

  // Extract all middleware functions from registry
  const middleware: ServerMiddleware[] = [
    ...resolveGlobalMiddleware(globalMiddlewareNames, middlewareRegistry),
    // Named middleware will be resolved via middlewareResolver at request time
  ];

  return {
    routes: serverRoutes,
    middleware,
    middlewareResolver: createMiddlewareResolver(middlewareRegistry),
    fetch: fallback,
  };
}

function convertRoutesToSevok(routes: ServerRouteRecord[]): ServerRoutes {
  const serverRoutes: ServerRoutes = {};

  for (const route of routes) {
    const { definition, middleware } = route;

    // Collect route-level middleware (inherited + route-specific)
    const routeMiddleware: ServerMiddleware[] = [
      ...(middleware ?? []),
      ...(definition.middleware ?? []),
    ];

    // Build method handlers map, including wildcard
    const methodHandlers: Partial<Record<string, ServerHandler>> = {};
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "*"] as const;

    for (const method of methods) {
      const handler = definition[method];
      if (handler) {
        methodHandlers[method] = handler;
      }
    }

    const hasMethods = Object.keys(methodHandlers).length > 0;
    const hasMiddleware = routeMiddleware.length > 0;

    // Build the route entry
    if (hasMethods) {
      if (hasMiddleware) {
        // Need to wrap in handler object to attach middleware
        const firstMethod = Object.keys(methodHandlers)[0] as keyof typeof methodHandlers;
        serverRoutes[route.path] = {
          handle: normalizeHandler(methodHandlers[firstMethod]!),
          middleware: routeMiddleware,
          ...methodHandlers,
        };
      } else {
        // Just method handlers, no middleware
        serverRoutes[route.path] = methodHandlers as ServerRoutes[string];
      }
    }
  }

  return serverRoutes;
}

function normalizeHandler(handler: ServerHandler): ServerHandlerFunction {
  if (typeof handler === "function") {
    return handler;
  }
  // ServerHandlerObject
  return (context) => handler.handle(context);
}

function resolveGlobalMiddleware(
  globalMiddlewareNames: readonly string[] | undefined,
  registry: Record<string, ServerMiddleware>,
): ServerMiddleware[] {
  if (!globalMiddlewareNames) return [];

  return globalMiddlewareNames.map((name) => {
    const middleware = registry[name];
    if (!middleware) {
      throw new Error(`Unknown global middleware "${name}".`);
    }
    return middleware;
  });
}

function createMiddlewareResolver(
  registry: Record<string, ServerMiddleware>,
): ServerMiddlewareResolver {
  return (name) => {
    const middleware = registry[name];
    // Return only function middleware, skip string references
    return typeof middleware === "function" ? (middleware as ServerMiddlewareFunction) : undefined;
  };
}
