import { extname, relative, resolve } from "node:path";
import { build, type RouteNode } from "fs-route-ir";
import type { ScannedServerRoute } from "./route-manifest";
import { rethrowServerRouteBuildError } from "../../server-routes/errors";
import {
  collectEntryFiles,
  DIRECTORY_MIDDLEWARE_BASENAME,
  getEntryBaseName,
  normalizeDirectoryMiddlewareExtensions,
  resolveNestedFiles,
  resolveSingleEntryFile,
  toPosixPath,
  toRootRelativeRouteFile,
  type ServerEntryKind,
} from "./scanner-utils";

export async function scanServerRoutes(options: {
  root: string;
  routesDir: string;
  extensions: string[];
}): Promise<ScannedServerRoute[]> {
  const files = await resolveNestedFiles(options.routesDir);
  if (files.length === 0) {
    return [];
  }

  const directoryMiddlewareExtensions = normalizeDirectoryMiddlewareExtensions(options.extensions);
  let result;
  try {
    result = build(files, {
      profile: "file-based",
      root: "",
      ignore(entry, kind) {
        if (kind === "dir") {
          return false;
        }

        return !options.extensions.includes(extname(entry));
      },
      defineEntry({ file, baseName }) {
        if (baseName === DIRECTORY_MIDDLEWARE_BASENAME) {
          if (!directoryMiddlewareExtensions.includes(extname(file))) {
            return null;
          }

        return {
          kind: "middleware" as const,
          scope: "directory" as const,
        };
        }

        return {
          kind: "route" as const,
        };
      },
      isRouteFile(file) {
        return getEntryBaseName(file) !== DIRECTORY_MIDDLEWARE_BASENAME;
      },
    });
  } catch (error) {
    rethrowServerRouteBuildError(error);
  }

  return collectServerRoutes(result.tree.nodes, options);
}

export async function scanServerMiddlewareFiles(options: {
  root: string;
  middlewareDir: string;
  extensions: string[];
}): Promise<Record<string, string>> {
  const entries = await resolveNestedFiles(options.middlewareDir);
  const registry = new Map<string, string>();

  for (const entry of entries) {
    const extension = extname(entry);
    if (!options.extensions.includes(extension)) {
      continue;
    }

    const middlewareName = toPosixPath(entry.slice(0, -extension.length));
    if (registry.has(middlewareName)) {
      throw new Error(
        `Duplicate server middleware definitions found for "${middlewareName}" in server/middleware.`,
      );
    }

    registry.set(
      middlewareName,
      toPosixPath(relative(options.root, resolve(options.middlewareDir, entry))),
    );
  }

  return Object.fromEntries(
    [...registry.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function collectServerRoutes(
  nodes: RouteNode<unknown, ServerEntryKind>[],
  options: {
    root: string;
    routesDir: string;
  },
): ScannedServerRoute[] {
  const routes: ScannedServerRoute[] = [];

  for (const node of nodes) {
    visit(node, []);
  }

  return routes.sort(
    (left, right) => left.path.localeCompare(right.path) || left.id.localeCompare(right.id),
  );

  function visit(
    node: RouteNode<unknown, ServerEntryKind>,
    inheritedMiddleware: string[],
  ): void {
    if (isDirectoryContainerNode(node)) {
      const localMiddleware = collectMiddlewareEntries(node, options);
      const nextMiddleware =
        localMiddleware.length > 0
          ? [...inheritedMiddleware, ...localMiddleware]
          : inheritedMiddleware;

      for (const child of node.children) {
        visit(child, nextMiddleware);
      }

      return;
    }

    const routeFile = resolveSingleEntryFile(
      collectEntryFiles(node.entries, "route"),
      node.dir,
      "route",
    );
    if (!routeFile) {
      throw new Error(`Route leaf "${node.id}" is missing a route file entry.`);
    }

    routes.push({
      id: node.id,
      file: toRootRelativeRouteFile(options.root, options.routesDir, routeFile),
      absoluteFile: toPosixPath(resolve(options.routesDir, routeFile)),
      middleware: inheritedMiddleware,
      path: node.pattern,
    });
  }
}

function collectMiddlewareEntries(
  node: RouteNode<unknown, ServerEntryKind>,
  options: {
    root: string;
    routesDir: string;
  },
): string[] {
  const file = resolveSingleEntryFile(
    collectEntryFiles(node.entries, "middleware"),
    node.dir,
    DIRECTORY_MIDDLEWARE_BASENAME,
  );
  if (!file) {
    return [];
  }

  return [toRootRelativeRouteFile(options.root, options.routesDir, file)];
}

function isDirectoryContainerNode<TMeta, TEntryKind extends string>(
  node: RouteNode<TMeta, TEntryKind>,
): boolean {
  return node.id.startsWith("dir:");
}
