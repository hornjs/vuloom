import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  loadConfigFromFile,
  normalizePath,
  type ConfigEnv,
  type InlineConfig,
  type LogLevel,
} from "vite";

export const DEFAULT_VULOOM_CONFIG_FILES = [
  "vuloom.config.ts",
  "vuloom.config.mts",
  "vuloom.config.js",
  "vuloom.config.mjs",
  "vuloom.config.cts",
  "vuloom.config.cjs",
] as const;

export interface VuloomDevConfig {
  host?: string;
  port?: number;
}

export interface VuloomServerConfig {
  middleware?: readonly string[];
}

export interface VuloomPluginOptions {
  root?: string;
  appDir?: string;
  extensions?: string[];
  routesDir?: string;
  serverRoutesDir?: string;
  serverMiddlewareDir?: string;
  moduleImportMode?: "dynamic" | "eager";
}

export interface VuloomAppConfig {
  middlewares?: readonly string[];
  dataQueryParam?: string;
  injectClientEntry?: boolean;
  clientEntryPath?: string;
}

export interface VuloomConfig {
  root?: string;
  app?: VuloomAppConfig;
  server?: VuloomServerConfig;
  dev?: VuloomDevConfig;
  vite?: InlineConfig;
  plugin?: VuloomPluginOptions;
}

/**
 * Config environment passed to config functions
 */
export interface VuloomConfigEnv {
  command: "build" | "serve";
  mode: string;
  isSsrBuild: boolean;
  isPreview: boolean;
}

/**
 * Config can be a static object or a function that returns a config (or Promise)
 */
export type VuloomConfigExport =
  | VuloomConfig
  | ((env: VuloomConfigEnv) => VuloomConfig | Promise<VuloomConfig>);

export interface LoadVuloomConfigOptions {
  root?: string;
  configFile?: string;
  command?: ConfigEnv["command"];
  mode?: string;
  isSsrBuild?: boolean;
  isPreview?: boolean;
  logLevel?: LogLevel;
}

export interface LoadedVuloomConfig {
  file?: string;
  searchRoot: string;
  configRoot: string;
  config: VuloomConfig;
  env: Required<Pick<LoadVuloomConfigOptions, "command" | "mode" | "isSsrBuild" | "isPreview">>;
}

/**
 * Define vuloom configuration
 * Accepts a static config object or a function that receives config env
 * Function can return config synchronously or asynchronously
 */
export function defineConfig(config: VuloomConfigExport): VuloomConfigExport {
  return config;
}

export async function loadVuloomConfig(
  options: LoadVuloomConfigOptions = {},
): Promise<LoadedVuloomConfig> {
  const searchRoot = resolve(options.root ?? process.cwd());
  const env = {
    command: options.command ?? "serve",
    mode: options.mode ?? process.env.NODE_ENV ?? "development",
    isSsrBuild: options.isSsrBuild ?? false,
    isPreview: options.isPreview ?? false,
  };
  const configFile = resolveConfigFile(searchRoot, options.configFile);

  if (!configFile) {
    return {
      searchRoot,
      configRoot: searchRoot,
      config: {},
      env,
    };
  }

  const loaded = await loadConfigFromFile(env, configFile, searchRoot, options.logLevel ?? "error");
  const rawConfig = (loaded?.config ?? {}) as VuloomConfigExport;

  // Support function config (sync or async)
  const config = await (typeof rawConfig === "function"
    ? rawConfig(env)
    : rawConfig);

  return {
    file: configFile,
    searchRoot,
    configRoot: resolve(dirname(configFile), config.root ?? "."),
    config,
    env,
  };
}

export function isVuloomConfigFile(file: string): boolean {
  const normalized = normalizePath(file);
  return DEFAULT_VULOOM_CONFIG_FILES.some(
    (configFile) => normalized.endsWith(`/${configFile}`) || normalized === configFile,
  );
}

function resolveConfigFile(root: string, configFile?: string): string | undefined {
  if (configFile) {
    const resolved = resolve(root, configFile);
    return existsSync(resolved) ? resolved : undefined;
  }

  return DEFAULT_VULOOM_CONFIG_FILES.map((file) => resolve(root, file)).find((file) =>
    existsSync(file),
  );
}
