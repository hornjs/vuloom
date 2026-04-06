import { extname, relative, resolve } from "node:path";
import type { ScannedAppRuntime } from "./route-manifest";
import {
  resolveDirectoryFiles,
  resolveNamedFile,
  resolveNestedFiles,
  toPosixPath,
} from "./scanner-utils";

export async function scanAppRuntime(options: {
  root: string;
  appDir: string;
  extensions: string[];
}): Promise<ScannedAppRuntime> {
  const appFiles = await resolveDirectoryFiles(options.appDir);
  const configExtensions = options.extensions.filter((extension) => extension !== ".vue");
  const appComponent = resolveNamedFile(options.appDir, appFiles, "app", options.extensions);
  const errorComponent = resolveNamedFile(options.appDir, appFiles, "error", options.extensions);
  const appLoader = resolveNamedFile(options.appDir, appFiles, "loader", configExtensions);
  const rootFiles = await resolveDirectoryFiles(options.root);
  const appConfigFromAppDir = resolveNamedFile(
    options.appDir,
    appFiles,
    "app.config",
    configExtensions,
  );
  const appConfigFromRoot = resolveNamedFile(
    options.root,
    rootFiles,
    "app.config",
    configExtensions,
  );
  const appConfig = appConfigFromAppDir ?? appConfigFromRoot;
  const middleware = await resolveAppMiddlewareFiles(
    options.root,
    options.appDir,
    configExtensions,
  );

  return {
    app: appComponent
      ? toPosixPath(relative(options.root, resolve(options.appDir, appComponent)))
      : undefined,
    error: errorComponent
      ? toPosixPath(relative(options.root, resolve(options.appDir, errorComponent)))
      : undefined,
    loader: appLoader
      ? toPosixPath(relative(options.root, resolve(options.appDir, appLoader)))
      : undefined,
    config: appConfig
      ? toPosixPath(
          relative(
            options.root,
            resolve(appConfigFromAppDir ? options.appDir : options.root, appConfig),
          ),
        )
      : undefined,
    middleware,
  };
}

async function resolveAppMiddlewareFiles(
  root: string,
  appDir: string,
  extensions: string[],
): Promise<Record<string, string>> {
  const middlewareDir = resolve(appDir, "middleware");
  const entries = await resolveNestedFiles(middlewareDir);
  const registry = new Map<string, string>();

  for (const entry of entries) {
    const extension = extname(entry);
    if (!extensions.includes(extension)) {
      continue;
    }

    const middlewareName = toPosixPath(entry.slice(0, -extension.length));
    if (registry.has(middlewareName)) {
      throw new Error(
        `Duplicate middleware definitions found for "${middlewareName}" in app/middleware.`,
      );
    }

    registry.set(middlewareName, toPosixPath(relative(root, resolve(middlewareDir, entry))));
  }

  return Object.fromEntries(
    [...registry.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}
