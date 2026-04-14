import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import {
  build as viteBuild,
  mergeConfig,
  type InlineConfig,
  type Plugin,
  type PluginOption,
} from "vite";
import { loadVuloomConfig, type VuloomConfig, type LoadVuloomConfigOptions } from "../config";
import { createClientEntryModule } from "../vite/generated/client-entry";
import { vuloom } from "../vite";

const VULOOM_BUILD_CLIENT_ENTRY_ID = "virtual:vuloom-client-entry";
const RESOLVED_VULOOM_BUILD_CLIENT_ENTRY_ID = "\0virtual:vuloom-client-entry";
const VULOOM_BUILD_SERVER_ENTRY_ID = "virtual:vuloom-server-entry";
const RESOLVED_VULOOM_BUILD_SERVER_ENTRY_ID = "\0virtual:vuloom-server-entry";

export const DEFAULT_CLIENT_BUILD_OUT_DIR = ".output/public";
export const DEFAULT_SERVER_BUILD_OUT_DIR = ".output/server";

export interface VuloomBuildOptions extends LoadVuloomConfigOptions {
  watch?: boolean;
}

export interface VuloomBuildResult {
  client: Awaited<ReturnType<typeof viteBuild>>;
  server: Awaited<ReturnType<typeof viteBuild>>;
}

export function createVuloomBuildServerEntryModule(): string {
  return [
    'import { Server } from "sevok"',
    'import { NodeRuntimeAdapter } from "sevok/node"',
    'import { serveStatic } from "sevok/static"',
    'import createAppPlugin from "vuloom/generated-app-plugin"',
    'import createServerPlugin from "vuloom/generated-server-plugin"',
    "",
    'export const generatedAppPluginId = "vuloom/generated-app-plugin"',
    'export const generatedServerPluginId = "vuloom/generated-server-plugin"',
    "",
    "export function createServerApp(options = {}) {",
    "  const {",
    "    manual = false,",
    "    clientEntryPath,",
    "    publicDir,",
    "    fetch = createNotFoundResponse,",
    "    middleware = [],",
    "    adapter = new NodeRuntimeAdapter(),",
    "    ...serverOptions",
    "  } = options",
    "  return new Server({",
    "    manual,",
    "    adapter,",
    "    ...serverOptions,",
    "    middleware: [",
    "      ...(publicDir ? [serveStatic({ dir: publicDir })] : []),",
    "      createServerPlugin(),",
    "      createAppPlugin({ clientEntryPath }),",
    "      ...middleware,",
    "    ],",
    "    fetch,",
    "  })",
    "}",
    "",
    "function createNotFoundResponse() {",
    '  return new Response("Not Found", { status: 404 })',
    "}",
    "",
    "export default createServerApp",
  ].join("\n");
}

export async function buildVuloomApp(options: VuloomBuildOptions = {}): Promise<VuloomBuildResult> {
  const loadedConfig = await loadVuloomConfig({
    root: options.root,
    configFile: options.configFile,
    command: "build",
    mode: options.mode ?? "production",
    isSsrBuild: false,
    isPreview: false,
    logLevel: options.logLevel,
  });
  const root = loadedConfig.configRoot;
  const client = await viteBuild(createVuloomClientBuildConfig(loadedConfig.config, root, options));
  const server = await viteBuild(
    await createVuloomServerBuildConfig(loadedConfig.config, root, options),
  );

  return {
    client,
    server,
  };
}

function createVuloomClientBuildConfig(
  config: VuloomConfig,
  root: string,
  options: Pick<VuloomBuildOptions, "watch" | "logLevel">,
): InlineConfig {
  const vueFeatureFlags = {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
  };
  const routesPlugin = vuloom({
    ...config.plugin,
    root: config.plugin?.root ?? root,
  });
  const clientEntryPlugin = createVuloomBuildClientEntryPlugin();
  const userViteConfig = config.vite ?? {};
  const userPlugins = normalizePlugins(userViteConfig.plugins);
  const defaultBuildConfig = createDefaultClientBuildConfig(userViteConfig, options.watch);
  const baseConfig: InlineConfig = {
    configFile: false,
    root,
    appType: "custom",
    mode: "production",
    logLevel: options.logLevel ?? "info",
    define: vueFeatureFlags,
    optimizeDeps: {
      rolldownOptions: {
        transform: {
          define: Object.fromEntries(
            Object.entries(vueFeatureFlags).map(([key, value]) => [key, JSON.stringify(value)]),
          ),
        },
      },
    },
    plugins: createBuildPlugins({
      entryPlugin: clientEntryPlugin,
      routesPlugin,
      userPlugins,
    }),
    build: defaultBuildConfig,
  };

  return mergeConfig(baseConfig, userViteConfig);
}

async function createVuloomServerBuildConfig(
  config: VuloomConfig,
  root: string,
  options: Pick<VuloomBuildOptions, "watch" | "logLevel">,
): Promise<InlineConfig> {
  const routesPlugin = vuloom({
    ...config.plugin,
    root: config.plugin?.root ?? root,
  });
  const serverEntryPlugin = createVuloomBuildServerEntryPlugin();
  const userViteConfig = config.vite ?? {};
  const userPlugins = normalizePlugins(userViteConfig.plugins);
  const serverOutDir = resolve(root, DEFAULT_SERVER_BUILD_OUT_DIR);

  await mkdir(serverOutDir, {
    recursive: true,
  });
  const baseConfig: InlineConfig = {
    configFile: false,
    root,
    appType: "custom",
    mode: "production",
    logLevel: options.logLevel ?? "info",
    plugins: createBuildPlugins({
      entryPlugin: serverEntryPlugin,
      routesPlugin,
      userPlugins,
    }),
    build: {
      ssr: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
      watch: options.watch ? {} : null,
      manifest: false,
      ssrManifest: false,
      rollupOptions: {
        input: VULOOM_BUILD_SERVER_ENTRY_ID,
        output: {
          format: "es",
          entryFileNames: "index.js",
        },
      },
    },
  };

  return mergeConfig(baseConfig, {
    ...userViteConfig,
    build: {
      ...userViteConfig.build,
      ssr: true,
      outDir: serverOutDir,
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
      watch: options.watch ? (userViteConfig.build?.watch ?? {}) : null,
      manifest: false,
      ssrManifest: false,
      rollupOptions: mergeConfig(
        {
          input: VULOOM_BUILD_SERVER_ENTRY_ID,
          output: {
            format: "es",
            entryFileNames: "index.js",
          },
        },
        userViteConfig.build?.rollupOptions ?? {},
      ),
    },
  });
}

function createDefaultClientBuildConfig(
  userViteConfig: InlineConfig,
  watch: boolean | undefined,
): NonNullable<InlineConfig["build"]> {
  const userBuild = userViteConfig.build ?? {};
  const hasCustomInput = Boolean(userBuild.lib || userBuild.rollupOptions?.input);

  return {
    outDir: userBuild.outDir ?? DEFAULT_CLIENT_BUILD_OUT_DIR,
    manifest: userBuild.manifest ?? true,
    ...(watch ? { watch: userBuild.watch ?? {} } : {}),
    ...(!hasCustomInput
      ? {
          rollupOptions: mergeConfig(
            {
              input: {
                "client-entry": VULOOM_BUILD_CLIENT_ENTRY_ID,
              },
            },
            userBuild.rollupOptions ?? {},
          ),
        }
      : {}),
  };
}

function createVuloomBuildClientEntryPlugin(): Plugin {
  return {
    name: "vuloom:build-client-entry",
    enforce: "pre",
    resolveId(id) {
      if (id === VULOOM_BUILD_CLIENT_ENTRY_ID) {
        return RESOLVED_VULOOM_BUILD_CLIENT_ENTRY_ID;
      }

      return null;
    },
    load(id) {
      if (id === RESOLVED_VULOOM_BUILD_CLIENT_ENTRY_ID) {
        return createClientEntryModule({
          idPrefix: "",
        });
      }

      return null;
    },
  };
}

function createVuloomBuildServerEntryPlugin(): Plugin {
  return {
    name: "vuloom:build-server-entry",
    enforce: "pre",
    resolveId(id) {
      if (id === VULOOM_BUILD_SERVER_ENTRY_ID) {
        return RESOLVED_VULOOM_BUILD_SERVER_ENTRY_ID;
      }

      return null;
    },
    load(id) {
      if (id === RESOLVED_VULOOM_BUILD_SERVER_ENTRY_ID) {
        return createVuloomBuildServerEntryModule();
      }

      return null;
    },
  };
}

function createBuildPlugins(options: {
  entryPlugin: Plugin;
  routesPlugin: Plugin;
  userPlugins: PluginOption[];
}): PluginOption[] {
  return [
    options.entryPlugin,
    ...(hasVuePlugin(options.userPlugins) ? [] : [vue() as PluginOption]),
    ...(hasVueJsxPlugin(options.userPlugins) ? [] : [vueJsx() as PluginOption]),
    ...(hasVuloomPlugin(options.userPlugins) ? [] : [options.routesPlugin]),
    ...options.userPlugins,
  ];
}

function hasVuloomPlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "vuloom:routes",
  );
}

function hasVuePlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "vite:vue",
  );
}

function hasVueJsxPlugin(plugins: PluginOption[]): boolean {
  return plugins.some(
    (plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin && plugin.name === "vite:vue-jsx",
  );
}

function normalizePlugins(plugins: InlineConfig["plugins"]): PluginOption[] {
  if (!plugins) {
    return [];
  }

  return flattenPlugins(Array.isArray(plugins) ? plugins : [plugins]);
}

function flattenPlugins(plugins: readonly PluginOption[]): PluginOption[] {
  const flattened: PluginOption[] = [];

  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flattened.push(...flattenPlugins(plugin));
      continue;
    }

    flattened.push(plugin);
  }

  return flattened;
}
