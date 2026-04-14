import { readdir, stat } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import type { ScannedRouteModule, ScannedServerRoute } from "./route-manifest";
import { collectAppPagePaths } from "./route-manifest";

export const DEFAULT_APP_DIR = "app";
export const DEFAULT_SERVER_ROUTES_DIR = "server/routes";
export const DEFAULT_SERVER_MIDDLEWARE_DIR = "server/middleware";
export const DEFAULT_EXTENSIONS = [".vue", ".ts", ".js", ".tsx", ".jsx"];
export const ROUTE_FILE_BASENAMES = [
  "layout",
  "page",
  "error",
  "loading",
  "action",
  "loader",
  "middleware",
] as const;
export const DIRECTORY_MIDDLEWARE_BASENAME = "_middleware";

export type RouteFileBaseName = (typeof ROUTE_FILE_BASENAMES)[number];
export type AppEntryKind = RouteFileBaseName | "directory-middleware";
export type ServerEntryKind = "route" | "directory-middleware";

export function normalizeExtensions(extensions?: string[]): string[] {
  const resolved = extensions?.length ? extensions : DEFAULT_EXTENSIONS;
  return Array.from(
    new Set(resolved.map((extension) => (extension.startsWith(".") ? extension : `.${extension}`))),
  );
}

export function normalizeDirectoryMiddlewareExtensions(extensions: string[]): string[] {
  const filtered = extensions.filter((extension) => extension !== ".vue");
  return filtered.length > 0 ? filtered : extensions;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveDirectoryFiles(directory: string): Promise<string[]> {
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

export async function resolveNestedFiles(directory: string, relativeDir = ""): Promise<string[]> {
  if (!(await exists(directory))) {
    return [];
  }

  const entries = await readdir(resolve(directory, relativeDir), {
    withFileTypes: true,
  });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const nextRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await resolveNestedFiles(directory, nextRelativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(toPosixPath(nextRelativePath));
    }
  }

  return files;
}

export function resolveNamedFile(
  directory: string,
  files: string[],
  baseName: string,
  extensions: string[],
): string | undefined {
  const matches = files.filter((file) => {
    const extension = extname(file);
    return extensions.includes(extension) && file.slice(0, -extension.length) === baseName;
  });

  if (matches.length <= 1) {
    return matches[0];
  }

  throw new Error(
    `Duplicate ${baseName} files found in ${directory || "."}: ${matches.join(", ")}`,
  );
}

export function resolveSingleEntryFile(
  files: string[],
  directory: string,
  label: string,
): string | undefined {
  if (files.length <= 1) {
    return files[0];
  }

  throw new Error(
    `Duplicate ${label} files found in ${directory || "."}: ${files.map((file) => basename(file)).join(", ")}`,
  );
}

export function collectEntryFiles<TEntryKind extends string>(
  entries: Array<{
    kind: TEntryKind;
    file: string;
  }>,
  kind: TEntryKind,
): string[] {
  return entries.filter((entry) => entry.kind === kind).map((entry) => entry.file);
}

export function toRootRelativeRouteFile(root: string, routesDir: string, file: string): string {
  return toPosixPath(relative(root, resolve(routesDir, file)));
}

export function getEntryBaseName(entry: string): string {
  const extension = extname(entry);
  const fileName = entry.slice(entry.lastIndexOf("/") + 1);
  return fileName.slice(0, fileName.length - extension.length);
}

export function getLastPathSegment(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex >= 0 ? path.slice(separatorIndex + 1) : path;
}

export function isRouteDirectory(name: string): boolean {
  return !name.startsWith(".") && !name.startsWith("_");
}

export function assertServerRouteConflicts(
  appModules: ScannedRouteModule[],
  serverRoutes: ScannedServerRoute[],
): void {
  if (serverRoutes.length === 0) {
    return;
  }

  const appPaths = new Set(collectAppPagePaths(appModules));

  for (const serverRoute of serverRoutes) {
    for (const appPath of appPaths) {
      if (!routePatternsOverlap(appPath, serverRoute.path)) {
        continue;
      }

      throw new Error(
        `Server route "${serverRoute.path}" from ${serverRoute.file} conflicts with app page path "${appPath}". Vuloom does not split path ownership between app/pages and server/routes, even across different HTTP methods.`,
      );
    }
  }
}

function routePatternsOverlap(leftPath: string, rightPath: string): boolean {
  const leftSegments = routePatternSegments(leftPath);
  const rightSegments = routePatternSegments(rightPath);
  const memo = new Map<string, boolean>();

  return visit(0, 0);

  function visit(leftIndex: number, rightIndex: number): boolean {
    const key = `${leftIndex}:${rightIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let result = false;

    if (leftIndex === leftSegments.length && rightIndex === rightSegments.length) {
      result = true;
    } else if (leftIndex < leftSegments.length && leftSegments[leftIndex] === "*") {
      result =
        leftIndex === leftSegments.length - 1 ||
        visit(leftIndex + 1, rightIndex) ||
        (rightIndex < rightSegments.length && visit(leftIndex, rightIndex + 1));
    } else if (rightIndex < rightSegments.length && rightSegments[rightIndex] === "*") {
      result =
        rightIndex === rightSegments.length - 1 ||
        visit(leftIndex, rightIndex + 1) ||
        (leftIndex < leftSegments.length && visit(leftIndex + 1, rightIndex));
    } else if (leftIndex < leftSegments.length && rightIndex < rightSegments.length) {
      result =
        routeSegmentsCompatible(leftSegments[leftIndex], rightSegments[rightIndex]) &&
        visit(leftIndex + 1, rightIndex + 1);
    }

    memo.set(key, result);
    return result;
  }
}

function routeSegmentsCompatible(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  return left.startsWith(":") || right.startsWith(":");
}

function routePatternSegments(path: string): string[] {
  if (path === "/" || !path) {
    return [];
  }

  return path.split("/").filter(Boolean);
}

export function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/");
}
