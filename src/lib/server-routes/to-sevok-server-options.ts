import type {
  ServerHandler,
  ServerHandlerFunction,
  ServerMiddleware,
  ServerMiddlewareFunction,
  ServerMiddlewareResolver,
  ServerOptions,
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
 * Convert phial server routes to sevok ServerOptions.
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
): Pick<ServerOptions, "routes" | "middleware" | "middlewareResolver" | "fetch"> {
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
    const { definition, directoryMiddlewareNames } = route;

    // Collect route-level middleware (directory + route-specific)
    const routeMiddlewareNames: string[] = [
      ...(directoryMiddlewareNames ?? []),
      ...(definition.middlewareNames ?? []),
    ];

    // Build method handlers map
    const methodHandlers: Partial<Record<string, ServerHandler>> = {};
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

    for (const method of methods) {
      const handler = definition[method];
      if (handler) {
        methodHandlers[method] = handler;
      }
    }

    const hasMethods = Object.keys(methodHandlers).length > 0;
    const hasMiddleware = routeMiddlewareNames.length > 0;

    // Determine the final handler for this route
    if (definition.handler) {
      // Has generic handler - use as base, add method handlers as overrides
      if (hasMethods) {
        // Both generic and method handlers - create combined handler object
        serverRoutes[route.path] = {
          handle: normalizeHandler(definition.handler),
          ...(hasMiddleware ? { middleware: routeMiddlewareNames } : {}),
          ...methodHandlers,
        };
      } else if (hasMiddleware) {
        // Only generic handler with middleware
        serverRoutes[route.path] = {
          handle: normalizeHandler(definition.handler),
          middleware: routeMiddlewareNames,
        };
      } else {
        // Just the generic handler
        serverRoutes[route.path] = definition.handler;
      }
    } else if (hasMethods) {
      // Only method-specific handlers
      // Create a handler object with methods, optionally with middleware
      if (hasMiddleware) {
        // Use first method handler as the base handle, others as overrides
        const firstMethod = Object.keys(methodHandlers)[0] as keyof typeof methodHandlers;
        serverRoutes[route.path] = {
          handle: normalizeHandler(methodHandlers[firstMethod]!),
          middleware: routeMiddlewareNames,
          ...methodHandlers,
        };
      } else {
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
