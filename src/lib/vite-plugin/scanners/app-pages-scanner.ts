import { basename, extname, relative, resolve } from "node:path";
import { build, type RouteNode, type SegmentToken } from "fs-route-ir";
import type { ScannedRouteModule } from "./route-manifest";
import {
  collectEntryFiles,
  DIRECTORY_MIDDLEWARE_BASENAME,
  getLastPathSegment,
  isRouteDirectory,
  normalizeDirectoryMiddlewareExtensions,
  resolveNestedFiles,
  resolveSingleEntryFile,
  ROUTE_FILE_BASENAMES,
  toPosixPath,
  toRootRelativeRouteFile,
  type AppEntryKind,
  type RouteFileBaseName,
} from "./scanner-utils";

interface LayoutAnchor {
  id: string;
  segments: string[];
  middlewareDepth: number;
}

export async function scanAppPageRoutes(options: {
  root: string;
  routesDir: string;
  extensions: string[];
}): Promise<ScannedRouteModule[]> {
  const files = await resolveNestedFiles(options.routesDir);
  if (files.length === 0) {
    return [];
  }

  const directoryMiddlewareExtensions = normalizeDirectoryMiddlewareExtensions(options.extensions);
  const result = build(files, {
    profile: "directory-based",
    root: "",
    ignore(entry, kind) {
      if (kind === "dir") {
        return !isRouteDirectory(getLastPathSegment(entry));
      }

      return !options.extensions.includes(extname(entry));
    },
    defineEntry({ file, baseName }) {
      if (baseName === DIRECTORY_MIDDLEWARE_BASENAME) {
        if (!directoryMiddlewareExtensions.includes(extname(file))) {
          return null;
        }

        return {
          kind: "directory-middleware" as const,
          scope: "directory" as const,
        };
      }

      if ((ROUTE_FILE_BASENAMES as readonly string[]).includes(baseName)) {
        return {
          kind: baseName as RouteFileBaseName,
        };
      }

      return null;
    },
  });

  return collectAppRouteModules(result.tree.nodes, options);
}

function collectAppRouteModules(
  nodes: RouteNode<unknown, AppEntryKind>[],
  options: {
    root: string;
    routesDir: string;
  },
): ScannedRouteModule[] {
  const modules: ScannedRouteModule[] = [];

  for (const node of nodes) {
    visit(node, null, []);
  }

  return modules;

  function visit(
    node: RouteNode<unknown, AppEntryKind>,
    inheritedLayout: LayoutAnchor | null,
    inheritedDirectoryMiddleware: string[],
  ): void {
    const { routeFiles, directoryMiddlewareFile } = collectAppNodeEntries(node, options);
    const nextDirectoryMiddleware = directoryMiddlewareFile
      ? [...inheritedDirectoryMiddleware, directoryMiddlewareFile]
      : inheritedDirectoryMiddleware;
    const routeSegments = toManifestRouteSegments(node.segments);
    let currentLayout = inheritedLayout;

    assertRouteDirectoryFiles(node.dir, routeFiles);

    if (routeFiles.layout) {
      const layoutId = createRouteId(node.id, "layout");

      modules.push(
        createScannedRouteModule({
          id: layoutId,
          kind: "layout",
          root: options.root,
          routesDir: options.routesDir,
          file: routeFiles.layout,
          directoryMiddleware: createDirectoryMiddlewareDelta(
            nextDirectoryMiddleware,
            inheritedLayout?.middlewareDepth,
          ),
          files: createPrimaryRouteFiles(routeFiles, "layout"),
          path: createLayoutPath(routeSegments, inheritedLayout?.segments),
          parentId: inheritedLayout?.id,
        }),
      );

      currentLayout = {
        id: layoutId,
        segments: routeSegments,
        middlewareDepth: nextDirectoryMiddleware.length,
      };
    }

    if (routeFiles.page) {
      modules.push(
        createScannedRouteModule({
          id: createRouteId(node.id, "page"),
          kind: "page",
          root: options.root,
          routesDir: options.routesDir,
          file: routeFiles.page,
          directoryMiddleware: createDirectoryMiddlewareDelta(
            nextDirectoryMiddleware,
            currentLayout?.middlewareDepth,
          ),
          files: routeFiles.layout
            ? { page: routeFiles.page }
            : createPrimaryRouteFiles(routeFiles, "page"),
          ...createPageRouteLocation(
            routeSegments,
            inheritedLayout,
            currentLayout,
            Boolean(routeFiles.layout),
          ),
        }),
      );
    }

    for (const child of node.children) {
      visit(child, currentLayout, nextDirectoryMiddleware);
    }
  }
}

function collectAppNodeEntries(
  node: RouteNode<unknown, AppEntryKind>,
  options: {
    root: string;
    routesDir: string;
  },
): {
  routeFiles: Partial<Record<RouteFileBaseName, string>>;
  directoryMiddlewareFile?: string;
} {
  const routeFiles: Partial<Record<RouteFileBaseName, string>> = {};

  for (const kind of ROUTE_FILE_BASENAMES) {
    const file = resolveSingleEntryFile(collectEntryFiles(node.entries, kind), node.dir, kind);
    if (file) {
      routeFiles[kind] = file;
    }
  }

  const directoryMiddleware = resolveSingleEntryFile(
    collectEntryFiles(node.entries, "directory-middleware"),
    node.dir,
    DIRECTORY_MIDDLEWARE_BASENAME,
  );

  return {
    routeFiles,
    directoryMiddlewareFile: directoryMiddleware
      ? toRootRelativeRouteFile(options.root, options.routesDir, directoryMiddleware)
      : undefined,
  };
}

function createPrimaryRouteFiles(
  routeFiles: Partial<Record<RouteFileBaseName, string>>,
  primaryKind: "layout" | "page",
): ScannedRouteModule["files"] {
  const primaryFile = routeFiles[primaryKind];
  const files: ScannedRouteModule["files"] = primaryFile ? { [primaryKind]: primaryFile } : {};

  for (const key of ROUTE_FILE_BASENAMES) {
    if (key === "page" || key === "layout") {
      continue;
    }

    const file = routeFiles[key];
    if (file) {
      files[key] = file;
    }
  }

  return files;
}

function assertRouteDirectoryFiles(
  relativeDir: string,
  routeFiles: Partial<Record<RouteFileBaseName, string>>,
): void {
  const hasAuxiliaryFiles = ROUTE_FILE_BASENAMES.some(
    (fileName) => fileName !== "page" && fileName !== "layout" && routeFiles[fileName],
  );
  if (!hasAuxiliaryFiles) {
    return;
  }

  if (routeFiles.page || routeFiles.layout) {
    return;
  }

  const presentFiles = ROUTE_FILE_BASENAMES.filter((fileName) => routeFiles[fileName]).map(
    (fileName) => basename(routeFiles[fileName] ?? ""),
  );

  throw new Error(
    `Route directory ${relativeDir || "."} contains ${presentFiles.join(", ")} but is missing page/layout.`,
  );
}

function createPageRouteLocation(
  segments: string[],
  inheritedLayout: LayoutAnchor | null,
  currentLayout: LayoutAnchor | null,
  hasLocalLayout: boolean,
): Pick<ScannedRouteModule, "path" | "parentId" | "index"> {
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
      path: relativeSegments.length > 0 ? relativeSegments.join("/") : "",
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

function createScannedRouteModule(options: {
  id: string;
  kind: ScannedRouteModule["kind"];
  root: string;
  routesDir: string;
  file: string;
  directoryMiddleware: string[];
  files: ScannedRouteModule["files"];
  path: string;
  parentId?: string;
  index?: boolean;
}): ScannedRouteModule {
  const absoluteFile = resolve(options.routesDir, options.file);

  return {
    id: options.id,
    kind: options.kind,
    file: toPosixPath(relative(options.root, absoluteFile)),
    absoluteFile: toPosixPath(absoluteFile),
    directoryMiddleware: options.directoryMiddleware,
    files: Object.fromEntries(
      Object.entries(options.files).map(([kind, file]) => [
        kind,
        toRootRelativeRouteFile(options.root, options.routesDir, file),
      ]),
    ) as ScannedRouteModule["files"],
    path: options.path,
    parentId: options.parentId,
    index: options.index,
  };
}

function createRouteId(nodeId: string, kind: "layout" | "page"): string {
  if (!nodeId) {
    return kind;
  }

  return `${nodeId}/${kind}`;
}

function createDirectoryMiddlewareDelta(
  directoryMiddleware: string[],
  previousDepth?: number,
): string[] {
  if (!previousDepth) {
    return directoryMiddleware;
  }

  return directoryMiddleware.slice(previousDepth);
}

function toManifestRouteSegments(segments: SegmentToken[]): string[] {
  return segments.flatMap((segment) => {
    if (segment.type === "group") {
      return [];
    }

    if (segment.type === "static") {
      return [segment.value];
    }

    if (segment.type === "dynamic") {
      return [`:${segment.name}`];
    }

    if (segment.type === "catchall" || segment.type === "optional-catchall") {
      return ["*"];
    }

    return [];
  });
}
