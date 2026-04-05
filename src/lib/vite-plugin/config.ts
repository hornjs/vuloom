import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  loadConfigFromFile,
  normalizePath,
  type ConfigEnv,
  type InlineConfig,
  type LogLevel,
} from "vite";

export const DEFAULT_PHIAL_CONFIG_FILES = [
  "phial.config.ts",
  "phial.config.mts",
  "phial.config.js",
  "phial.config.mjs",
  "phial.config.cts",
  "phial.config.cjs",
] as const;

export interface PhialDevConfig {
  host?: string;
  port?: number;
}

export interface PhialServerConfig {
  middleware?: readonly string[];
}

export interface PhialPluginOptions {
  root?: string;
  appDir?: string;
  extensions?: string[];
  routesDir?: string;
  serverRoutesDir?: string;
  serverMiddlewareDir?: string;
  moduleImportMode?: "dynamic" | "eager";
}

export interface PhialAppConfig {
  middlewares?: readonly string[];
  dataQueryParam?: string;
  injectClientEntry?: boolean;
  clientEntryPath?: string;
}

export interface PhialConfig {
  root?: string;
  app?: PhialAppConfig;
  server?: PhialServerConfig;
  dev?: PhialDevConfig;
  vite?: InlineConfig;
  plugin?: PhialPluginOptions;
}

export interface LoadPhialConfigOptions {
  root?: string;
  configFile?: string;
  command?: ConfigEnv["command"];
  mode?: string;
  isSsrBuild?: boolean;
  isPreview?: boolean;
  logLevel?: LogLevel;
}

export interface LoadedPhialConfig {
  file?: string;
  searchRoot: string;
  configRoot: string;
  config: PhialConfig;
  env: Required<Pick<LoadPhialConfigOptions, "command" | "mode" | "isSsrBuild" | "isPreview">>;
}

export function defineConfig(config: PhialConfig): PhialConfig {
  return config;
}

export async function loadPhialConfig(
  options: LoadPhialConfigOptions = {},
): Promise<LoadedPhialConfig> {
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
  const config = (loaded?.config ?? {}) as PhialConfig;

  return {
    file: configFile,
    searchRoot,
    configRoot: resolve(dirname(configFile), config.root ?? "."),
    config,
    env,
  };
}

export function isPhialConfigFile(file: string): boolean {
  const normalized = normalizePath(file);
  return DEFAULT_PHIAL_CONFIG_FILES.some(
    (configFile) => normalized.endsWith(`/${configFile}`) || normalized === configFile,
  );
}

function resolveConfigFile(root: string, configFile?: string): string | undefined {
  if (configFile) {
    const resolved = resolve(root, configFile);
    return existsSync(resolved) ? resolved : undefined;
  }

  return DEFAULT_PHIAL_CONFIG_FILES.map((file) => resolve(root, file)).find((file) =>
    existsSync(file),
  );
}
