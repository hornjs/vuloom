import type { RouteNode, RouteTree } from "fs-route-ir";
import type { ModuleResolver } from "../app-routes/types";
import { resolveDirectoryMiddlewareNames, resolveServerRouteDefinition } from "./resolve-server";
import type { ServerMiddleware, ServerRouteEntryKind, ServerRouteRecord } from "./types";

export async function resolveServerRouteRecords(options: {
  tree: RouteTree<unknown, ServerRouteEntryKind>;
  resolveModule: ModuleResolver["resolve"];
  middlewareRegistry: Record<string, ServerMiddleware>;
}): Promise<ServerRouteRecord[]> {
  const routes: ServerRouteRecord[] = [];

  for (const node of options.tree.nodes) {
    await visit(node, []);
  }

  return routes.sort(
    (left, right) => left.path.localeCompare(right.path) || left.id.localeCompare(right.id),
  );

  async function visit(
    node: RouteNode<unknown, ServerRouteEntryKind>,
    inheritedDirectoryMiddleware: string[],
  ): Promise<void> {
    if (isDirectoryContainerNode(node)) {
      const localDirectoryMiddleware = await collectDirectoryMiddlewareEntries(
        node,
        options.resolveModule,
        options.middlewareRegistry,
      );
      const nextDirectoryMiddleware =
        localDirectoryMiddleware.length > 0
          ? [...inheritedDirectoryMiddleware, ...localDirectoryMiddleware]
          : inheritedDirectoryMiddleware;

      for (const child of node.children) {
        await visit(child, nextDirectoryMiddleware);
      }

      return;
    }

    const routeFile = collectSingleEntryFile(node, "route");
    if (!routeFile) {
      throw new Error(`Route leaf "${node.id}" is missing a route file entry.`);
    }

    routes.push({
      id: node.id,
      path: node.pattern,
      file: routeFile,
      directoryMiddlewareNames: inheritedDirectoryMiddleware,
      definition: await resolveServerRouteDefinition(routeFile, options.resolveModule),
    });
  }
}

async function collectDirectoryMiddlewareEntries(
  node: RouteNode<unknown, ServerRouteEntryKind>,
  resolveModule: ModuleResolver["resolve"],
  middlewareRegistry: Record<string, ServerMiddleware>,
): Promise<string[]> {
  const file = collectSingleEntryFile(node, "directory-middleware");
  if (!file) {
    return [];
  }

  const middlewareNames = await resolveDirectoryMiddlewareNames(file, resolveModule);
  for (const name of middlewareNames) {
    if (!middlewareRegistry[name]) {
      throw new Error(
        `Unknown server middleware "${name}" referenced from ${file}. Register it in server middleware input first.`,
      );
    }
  }

  return middlewareNames;
}

function collectSingleEntryFile(
  node: RouteNode<unknown, ServerRouteEntryKind>,
  kind: ServerRouteEntryKind,
): string | undefined {
  const entries = node.entries.filter((entry) => entry.kind === kind);
  if (entries.length > 1) {
    throw new Error(`Node "${node.id}" contains multiple ${kind} entries.`);
  }

  return entries[0]?.file;
}

function isDirectoryContainerNode<TMeta, TEntryKind extends string>(
  node: RouteNode<TMeta, TEntryKind>,
): boolean {
  return node.id.startsWith("dir:");
}
