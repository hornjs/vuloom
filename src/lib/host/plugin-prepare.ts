import { loadVuloomConfig } from "../config/index.ts";
import { scanRoutes } from "../vite/scanners/routes-scanner";
import { writeVuloomProjectTypes, type GeneratedVuloomTypesResult } from "../vite/scanners/types-generator";

export interface VuloomPrepareOptions {
  root?: string;
  configFile?: string;
  mode?: string;
}

export async function prepareVuloomApp(
  options: VuloomPrepareOptions = {},
): Promise<GeneratedVuloomTypesResult> {
  const loadedConfig = await loadVuloomConfig({
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

  return writeVuloomProjectTypes(scannedRoutes, loadedConfig.file);
}
