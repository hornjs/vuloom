import type { RouteNode, RouteTree } from "fs-route-ir";
import type { PageRouteModule, PageMiddleware, PageRouteRecord } from "./types";
import { resolveComponentExport, resolveNamedHandlerExport } from "./resolve-app";
import type {
  AppRouteEntryKind,
  LayoutAnchor,
  MiddlewareReference,
  ModuleResolver,
  PendingRouteRecord,
  RouteSegmentToken,
} from "./types";

const SINGLE_ENTRY_KINDS = new Set<AppRouteEntryKind>([
  "layout",
  "page",
  "loading",
  "error",
  "loader",
  "action",
  "middleware",
  "directory-middleware",
]);

export async function resolveRouteModules(options: {
  tree: RouteTree<unknown, AppRouteEntryKind>;
  resolveModule: ModuleResolver["resolve"];
  middlewareRegistry: Record<string, PageMiddleware>;
}): Promise<PageRouteRecord[]> {
  const pendingRecords: PendingRouteRecord[] = [];

  for (const node of options.tree.nodes) {
    await visitNode(node, null, []);
  }

  return nestRouteRecords(pendingRecords);

  async function visitNode(
    node: RouteNode<unknown, AppRouteEntryKind>,
    inheritedLayout: LayoutAnchor | null,
    inheritedDirectoryMiddleware: PageMiddleware[],
  ): Promise<void> {
    const entryFiles = collectEntryFiles(node);
    assertRouteDirectoryFiles(node.dir, entryFiles);
    assertActionSidecar(entryFiles, node.dir);

    const localDirectoryMiddleware = entryFiles["directory-middleware"]
      ? await resolveMiddlewareReferences(
          entryFiles["directory-middleware"],
          options.resolveModule,
          options.middlewareRegistry,
        )
      : [];
    const nextDirectoryMiddleware = [...inheritedDirectoryMiddleware, ...localDirectoryMiddleware];
    const routeSegments = toRoutePathSegments(node.segments);
    const attachSidecarsToPage = Boolean(entryFiles.page);
    let currentLayout = inheritedLayout;

    if (entryFiles.layout) {
      const route: PendingRouteRecord = {
        id: createRouteId(node.id, "layout"),
        path: createLayoutPath(routeSegments, inheritedLayout?.segments),
        module: {
          layout: await resolveComponentExport(entryFiles.layout, options.resolveModule),
          ...(await createDirectoryMiddlewareModule(
            createDirectoryMiddlewareDelta(
              nextDirectoryMiddleware,
              inheritedLayout?.middlewareDepth,
            ),
          )),
          ...(!attachSidecarsToPage
            ? await resolvePrimaryRouteSidecars(
                entryFiles,
                options.resolveModule,
                options.middlewareRegistry,
              )
            : {}),
        },
        parentId: inheritedLayout?.id,
        children: [],
      };

      pendingRecords.push(route);
      currentLayout = {
        id: route.id,
        segments: routeSegments,
        middlewareDepth: nextDirectoryMiddleware.length,
      };
    }

    if (entryFiles.page) {
      const location = createPageRouteLocation(
        routeSegments,
        inheritedLayout,
        currentLayout,
        Boolean(entryFiles.layout),
      );
      const route: PendingRouteRecord = {
        id: createRouteId(node.id, "page"),
        path: location.path,
        module: {
          component: await resolveComponentExport(entryFiles.page, options.resolveModule),
          ...(await createDirectoryMiddlewareModule(
            createDirectoryMiddlewareDelta(
              nextDirectoryMiddleware,
              currentLayout?.middlewareDepth ?? inheritedLayout?.middlewareDepth,
            ),
          )),
          ...(await resolvePrimaryRouteSidecars(
            entryFiles,
            options.resolveModule,
            options.middlewareRegistry,
          )),
        },
        parentId: location.parentId,
        index: location.index,
        children: [],
      };

      pendingRecords.push(route);
    }

    for (const child of node.children) {
      await visitNode(child, currentLayout, nextDirectoryMiddleware);
    }
  }
}

async function createDirectoryMiddlewareModule(
  directoryMiddleware: PageMiddleware[],
): Promise<Partial<PageRouteModule>> {
  if (directoryMiddleware.length === 0) {
    return {};
  }

  return {
    middleware: [...directoryMiddleware],
  };
}

async function resolvePrimaryRouteSidecars(
  entryFiles: Partial<Record<AppRouteEntryKind, string>>,
  resolveModule: ModuleResolver["resolve"],
  middlewareRegistry: Record<string, PageMiddleware>,
): Promise<Partial<PageRouteModule>> {
  const module: Partial<PageRouteModule> = {};

  if (entryFiles.loading) {
    module.loading = await resolveComponentExport(entryFiles.loading, resolveModule);
  }

  if (entryFiles.error) {
    module.error = await resolveComponentExport(entryFiles.error, resolveModule);
  }

  if (entryFiles.loader) {
    module.loader = await resolveNamedHandlerExport(entryFiles.loader, "loader", resolveModule);
  }

  if (entryFiles.action) {
    module.action = await resolveNamedHandlerExport(entryFiles.action, "action", resolveModule);
  }

  if (entryFiles.middleware) {
    const middleware = await resolveMiddlewareReferences(
      entryFiles.middleware,
      resolveModule,
      middlewareRegistry,
    );

    if (middleware.length > 0) {
      module.middleware = [...(module.middleware ?? []), ...middleware];
    }
  }

  return module;
}

async function resolveMiddlewareReferences(
  file: string,
  resolveModule: ModuleResolver["resolve"],
  middlewareRegistry: Record<string, PageMiddleware>,
): Promise<PageMiddleware[]> {
  const resolved = await resolveModule(file);
  const candidate =
    typeof resolved === "object" && resolved && "default" in resolved
      ? (resolved as Record<string, unknown>).default
      : resolved;
  const references = Array.isArray(candidate) ? candidate : [candidate];
  const middleware: PageMiddleware[] = [];

  for (const reference of references as MiddlewareReference[]) {
    if (typeof reference === "function") {
      middleware.push(reference);
      continue;
    }

    const handler = middlewareRegistry[reference];
    if (!handler) {
      throw new Error(`Unknown middleware reference "${reference}" in "${file}".`);
    }

    middleware.push(handler);
  }

  return middleware;
}

function collectEntryFiles(
  node: RouteNode<unknown, AppRouteEntryKind>,
): Partial<Record<AppRouteEntryKind, string>> {
  const files: Partial<Record<AppRouteEntryKind, string>> = {};

  for (const entry of node.entries) {
    if (SINGLE_ENTRY_KINDS.has(entry.kind) && files[entry.kind]) {
      throw new Error(
        `Route directory "${node.dir || "."}" contains multiple ${entry.kind} entries.`,
      );
    }

    files[entry.kind] = entry.file;
  }

  return files;
}

function assertRouteDirectoryFiles(
  dir: string,
  entryFiles: Partial<Record<AppRouteEntryKind, string>>,
): void {
  const presentAuxiliaryEntries = [
    entryFiles.loading,
    entryFiles.error,
    entryFiles.loader,
    entryFiles.action,
    entryFiles.middleware,
  ].filter(Boolean);

  if (presentAuxiliaryEntries.length === 0) {
    return;
  }

  if (entryFiles.layout || entryFiles.page) {
    return;
  }

  const presentNames = presentAuxiliaryEntries.map((file) => file?.split("/").pop());
  throw new Error(
    `Route directory "${dir || "."}" contains ${presentNames.join(", ")} but is missing page.vue or layout.vue.`,
  );
}

function assertActionSidecar(
  entryFiles: Partial<Record<AppRouteEntryKind, string>>,
  dir: string,
): void {
  if (!entryFiles.action || entryFiles.page) {
    return;
  }

  throw new Error(`Route directory "${dir || "."}" defines action.ts but is missing page.vue.`);
}

function createRouteId(nodeId: string, kind: "layout" | "page"): string {
  return nodeId ? `${nodeId}/${kind}` : kind;
}

function createPageRouteLocation(
  segments: string[],
  inheritedLayout: LayoutAnchor | null,
  currentLayout: LayoutAnchor | null,
  hasLocalLayout: boolean,
): Pick<PendingRouteRecord, "path" | "parentId" | "index"> {
  if (hasLocalLayout && currentLayout) {
    return {
      path: "",
      parentId: currentLayout.id,
      index: true,
    };
  }

  if (currentLayout) {
    const relativeSegments = segments.slice(currentLayout.segments.length);
    return {
      path: relativeSegments.length > 0 ? relativeSegments.join("/") : "/",
      parentId: currentLayout.id,
      index: relativeSegments.length === 0,
    };
  }

  if (inheritedLayout) {
    const relativeSegments = segments.slice(inheritedLayout.segments.length);
    return {
      path: relativeSegments.length > 0 ? relativeSegments.join("/") : "/",
      parentId: inheritedLayout.id,
      index: relativeSegments.length === 0,
    };
  }

  return {
    path: segments.length > 0 ? segments.join("/") : "/",
  };
}

function createLayoutPath(segments: string[], parentSegments?: string[]): string {
  if (!parentSegments) {
    return segments.length > 0 ? segments.join("/") : "/";
  }

  const relativeSegments = segments.slice(parentSegments.length);
  return relativeSegments.length > 0 ? relativeSegments.join("/") : "";
}

function createDirectoryMiddlewareDelta(directoryMiddleware: PageMiddleware[], startIndex = 0) {
  return directoryMiddleware.slice(startIndex);
}

function toRoutePathSegments(tokens: RouteSegmentToken[]): string[] {
  const segments: string[] = [];

  for (const token of tokens) {
    if (token.type === "group") {
      continue;
    }

    if (token.type === "static") {
      segments.push(token.value);
      continue;
    }

    if (token.type === "dynamic") {
      segments.push(`:${token.name}`);
      continue;
    }

    segments.push("*");
  }

  return segments;
}

function nestRouteRecords(records: PendingRouteRecord[]): PageRouteRecord[] {
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const roots: PageRouteRecord[] = [];

  for (const record of records) {
    if (record.parentId) {
      const parent = recordMap.get(record.parentId);
      if (parent) {
        parent.children.push(record);
        continue;
      }
    }

    roots.push(record);
  }

  return roots;
}
