export interface RouteManifestEntry {
  id: string;
  kind?: "layout" | "page";
  path: string;
  file: string;
  parentId?: string;
  index?: boolean;
}

export interface ScannedRouteModule {
  id: string;
  kind: "layout" | "page";
  file: string;
  absoluteFile: string;
  directoryMiddleware: string[];
  path: string;
  parentId?: string;
  index?: boolean;
  files: Partial<
    Record<"page" | "layout" | "error" | "loading" | "action" | "loader" | "middleware", string>
  >;
}

export interface ScannedAppRuntime {
  app?: string;
  error?: string;
  config?: string;
  loader?: string;
  middleware: Record<string, string>;
}

export interface ScannedServerRoute {
  id: string;
  file: string;
  absoluteFile: string;
  directoryMiddleware: string[];
  path: string;
}

export interface ScannedServerRuntime {
  routesDir: string;
  middlewareDir: string;
  routes: ScannedServerRoute[];
  middleware: Record<string, string>;
}

export interface ScannedRoutesResult {
  root: string;
  appDir: string;
  routesDir: string;
  serverRoutesDir: string;
  serverMiddlewareDir: string;
  app: ScannedAppRuntime;
  server: ScannedServerRuntime;
  modules: ScannedRouteModule[];
  manifest: RouteManifestEntry[];
}

export function createRouteManifest(modules: ScannedRouteModule[]): RouteManifestEntry[] {
  return modules.map((module) => ({
    id: module.id,
    kind: module.kind,
    path: module.path,
    file: module.file,
    parentId: module.parentId,
    index: module.index,
  }));
}

export function collectAppPagePaths(modules: ScannedRouteModule[]): string[] {
  const records = new Map<
    string,
    {
      id: string;
      kind: ScannedRouteModule["kind"];
      path: string;
      parentId?: string;
      index?: boolean;
      children: string[];
      fullPath: string;
    }
  >();

  for (const module of modules) {
    records.set(module.id, {
      id: module.id,
      kind: module.kind,
      path: normalizeRouteSegment(module.path, module.index),
      parentId: module.parentId,
      index: module.index,
      children: [],
      fullPath: "/",
    });
  }

  const roots: string[] = [];

  for (const record of records.values()) {
    if (record.parentId) {
      const parent = records.get(record.parentId);
      if (parent) {
        parent.children.push(record.id);
        continue;
      }
    }

    roots.push(record.id);
  }

  for (const rootId of roots) {
    assignFullPath(rootId, "/");
  }

  return [...records.values()]
    .filter((record) => record.kind === "page")
    .map((record) => record.fullPath)
    .sort();

  function assignFullPath(id: string, parentPath: string): void {
    const record = records.get(id);
    if (!record) {
      return;
    }

    record.fullPath = record.index
      ? normalizeRoutePath(parentPath)
      : joinRoutePaths(parentPath, record.path);

    for (const childId of record.children) {
      assignFullPath(childId, record.fullPath);
    }
  }
}

function normalizeRouteSegment(path: string, index?: boolean): string {
  if (index || !path || path === "/") {
    return "";
  }

  return path.replace(/^\/|\/$/g, "");
}

function normalizeRoutePath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }

  const normalized = path.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  return normalized ? `/${normalized}` : "/";
}

function joinRoutePaths(parentPath: string, childPath: string): string {
  if (!childPath) {
    return normalizeRoutePath(parentPath);
  }

  const parent = parentPath === "/" ? "" : normalizeRoutePath(parentPath).slice(1);
  const child = childPath.replace(/^\/|\/$/g, "");
  const joined = [parent, child].filter(Boolean).join("/");

  return joined ? `/${joined}` : "/";
}
