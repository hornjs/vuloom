import { loadPhialConfig } from "../config/index.ts";
import { scanRoutes } from "../vite/scanners/routes-scanner";
import { writePhialProjectTypes, type GeneratedPhialTypesResult } from "../vite/scanners/types-generator";

export interface PhialPrepareOptions {
  root?: string;
  configFile?: string;
  mode?: string;
}

export async function preparePhialApp(
  options: PhialPrepareOptions = {},
): Promise<GeneratedPhialTypesResult> {
  const loadedConfig = await loadPhialConfig({
    root: options.root,
    configFile: options.configFile,
    command: "serve",
    mode: options.mode ?? "development",
    isSsrBuild: false,
    isPreview: false,
    logLevel: "info",
  });
  const configuredOptions = loadedConfig.config.plugin ?? {};
  const appDir = configuredOptions.appDir ?? "app";
  const scannedRoutes = await scanRoutes({
    root: configuredOptions.root ?? loadedConfig.configRoot,
    appDir,
    routesDir: configuredOptions.routesDir ?? `${appDir}/pages`,
    serverRoutesDir: configuredOptions.serverRoutesDir ?? "server/routes",
    serverMiddlewareDir: configuredOptions.serverMiddlewareDir ?? "server/middleware",
    extensions: configuredOptions.extensions,
  });

  return writePhialProjectTypes(scannedRoutes);
}
