import {
  runMiddleware,
  type ServerMiddleware,
  type ServerPlugin,
  type ServerRequest,
} from "@hornjs/fest";
import type { ServerRouteRecord } from "../server-routes/types";

export interface CreateServerRoutesPluginOptions {
  routes: ServerRouteRecord[];
  middlewareRegistry: Record<string, ServerMiddleware>;
  globalMiddlewareNames?: readonly string[];
}

export function createServerRoutesPlugin(options: CreateServerRoutesPluginOptions): ServerPlugin {
  return (server) => {
    server.options.middleware.unshift(createServerRoutesMiddleware(options));
  };
}

function createServerRoutesMiddleware(options: CreateServerRoutesPluginOptions): ServerMiddleware {
  return async (request, next) => {
    const route = findServerRoute(options.routes, new URL(request.url).pathname);
    if (!route) {
      return next(request);
    }

    const handler = getRouteHandler(route, request.method);
    if (!handler) {
      return new Response("Method Not Allowed", {
        status: 405,
      });
    }

    const middleware = resolveMiddlewareChain(
      route,
      options.middlewareRegistry,
      options.globalMiddlewareNames,
    );
    if (middleware.length === 0) {
      return handleRoute(request, handler);
    }

    return runMiddleware(middleware, request as ServerRequest, (nextRequest) =>
      handleRoute(nextRequest, handler),
    );
  };
}

async function handleRoute(
  request: Request,
  handler: (request: Request) => unknown | Promise<unknown>,
): Promise<Response> {
  const result = await handler(request);
  if (result instanceof Response) {
    return result;
  }

  return Response.json(result);
}

function resolveMiddlewareChain(
  route: ServerRouteRecord,
  registry: Record<string, ServerMiddleware>,
  globalMiddlewareNames: readonly string[] = [],
): ServerMiddleware[] {
  const names = [
    ...globalMiddlewareNames,
    ...(route.directoryMiddlewareNames ?? []),
    ...(route.definition.middlewareNames ?? []),
  ];

  return names.map((name) => {
    const middleware = registry[name];
    if (!middleware) {
      throw new Error(`Unknown server middleware "${name}" referenced by route "${route.id}".`);
    }

    return middleware;
  });
}

function findServerRoute(
  routes: ServerRouteRecord[],
  pathname: string,
): ServerRouteRecord | undefined {
  const normalizedPathname = normalizePathname(pathname);
  return routes.find((route) => matchesServerRoutePath(route.path, normalizedPathname));
}

function matchesServerRoutePath(pattern: string, pathname: string): boolean {
  const normalizedPattern = normalizePathname(pattern);
  if (normalizedPattern === pathname) {
    return true;
  }

  const patternSegments = splitPathSegments(normalizedPattern);
  const pathnameSegments = splitPathSegments(pathname);
  if (patternSegments.length !== pathnameSegments.length) {
    return false;
  }

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathnameSegment = pathnameSegments[index];

    if (!patternSegment) {
      return false;
    }

    if (patternSegment.startsWith(":")) {
      continue;
    }

    if (patternSegment !== pathnameSegment) {
      return false;
    }
  }

  return true;
}

function getRouteHandler(route: ServerRouteRecord, method: string) {
  const resolvedMethod = method.toUpperCase();
  const definition = route.definition;

  switch (resolvedMethod) {
    case "GET":
      return definition.GET ?? definition.handler;
    case "POST":
      return definition.POST ?? definition.handler;
    case "PUT":
      return definition.PUT ?? definition.handler;
    case "PATCH":
      return definition.PATCH ?? definition.handler;
    case "DELETE":
      return definition.DELETE ?? definition.handler;
    case "HEAD":
      return definition.HEAD ?? definition.handler;
    case "OPTIONS":
      return definition.OPTIONS ?? definition.handler;
    default:
      return definition.handler;
  }
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  if (!pathname.startsWith("/")) {
    return `/${pathname}`;
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }

  return pathname;
}

function splitPathSegments(pathname: string): string[] {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") {
    return [];
  }

  return normalized.replace(/^\/+|\/+$/g, "").split("/");
}
