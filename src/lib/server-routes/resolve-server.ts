import type { ModuleResolver } from "../app-routes/types";
import type {
  ScannedServerRuntimeInput,
  ServerMiddleware,
  ServerRouteHandler,
  ServerRouteDefinition,
} from "./types";

export async function resolveServerMiddlewareRegistry(
  input: ScannedServerRuntimeInput | undefined,
  resolveModule: ModuleResolver["resolve"],
): Promise<Record<string, ServerMiddleware>> {
  if (!input?.middleware) {
    return {};
  }

  const entries = await Promise.all(
    Object.entries(input.middleware).map(async ([name, file]) => {
      const middleware = await resolveServerMiddleware(file, resolveModule);
      return [name, middleware] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function resolveServerRouteDefinition(
  file: string,
  resolveModule: ModuleResolver["resolve"],
): Promise<ServerRouteDefinition> {
  const module = await resolveModule(file);
  const route =
    typeof module === "object" && module
      ? ((module as Record<string, unknown>).default ?? (module as Record<string, unknown>).route)
      : undefined;

  if (!route || typeof route !== "object") {
    throw new Error(
      `Invalid server route module "${file}". Expected a default export or named "route" export.`,
    );
  }

  const definition = route as Record<string, unknown>;

  return {
    middlewareNames: normalizeMiddlewareNames(definition.middleware),
    meta:
      definition.meta && typeof definition.meta === "object"
        ? (definition.meta as Record<string, unknown>)
        : undefined,
    GET: asHandler(definition.GET),
    POST: asHandler(definition.POST),
    PUT: asHandler(definition.PUT),
    PATCH: asHandler(definition.PATCH),
    DELETE: asHandler(definition.DELETE),
    HEAD: asHandler(definition.HEAD),
    OPTIONS: asHandler(definition.OPTIONS),
    "*": asHandler(definition["*"]),
  };
}

export async function resolveDirectoryMiddlewareNames(
  file: string,
  resolveModule: ModuleResolver["resolve"],
): Promise<string[]> {
  const module = await resolveModule(file);
  const middleware =
    typeof module === "object" && module
      ? ((module as Record<string, unknown>).middleware ??
        (module as Record<string, unknown>).default)
      : undefined;

  if (middleware === undefined) {
    return [];
  }

  if (!Array.isArray(middleware) || middleware.some((name) => typeof name !== "string")) {
    throw new Error(
      `Invalid server route directory middleware "${file}". Expected a default export or named "middleware" export with a string array.`,
    );
  }

  return [...middleware];
}

async function resolveServerMiddleware(
  file: string,
  resolveModule: ModuleResolver["resolve"],
): Promise<ServerMiddleware> {
  const module = await resolveModule(file);
  const middleware =
    typeof module === "object" && module
      ? ((module as Record<string, unknown>).middleware ??
        (module as Record<string, unknown>).default)
      : undefined;

  if (typeof middleware !== "function") {
    throw new Error(`Module "${file}" must export a server middleware function.`);
  }

  return middleware as ServerMiddleware;
}

function normalizeMiddlewareNames(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) {
    throw new Error('Server route "middleware" must be a string array.');
  }

  return [...value];
}

function asHandler(value: unknown): ServerRouteHandler | undefined {
  return typeof value === "function" ? (value as ServerRouteHandler) : undefined;
}
