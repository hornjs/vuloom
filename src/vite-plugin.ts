export {
  defineConfig,
  loadHornConfig,
  loadHornConfig as loadPhialConfig,
} from "./lib/vite-plugin/config";
export {
  buildHornApp,
  buildHornApp as buildPhialApp,
  DEFAULT_CLIENT_BUILD_OUT_DIR,
  DEFAULT_SERVER_BUILD_OUT_DIR,
  prepareHornApp,
  prepareHornApp as preparePhialApp,
  startHornDevServer,
  startHornDevServer as startPhialDevServer,
  startHornServer,
  startHornServer as startPhialServer,
} from "./lib/vite-plugin/host";
export {
  hornVitePlugin,
  hornVitePlugin as phialVitePlugin,
} from "./lib/vite-plugin/index";
export type {
  HornConfig,
  HornConfig as PhialConfig,
  HornDevConfig,
  HornDevConfig as PhialDevConfig,
  HornPluginOptions,
  HornPluginOptions as PhialPluginOptions,
  HornServerConfig,
  HornServerConfig as PhialServerConfig,
  LoadHornConfigOptions,
  LoadHornConfigOptions as LoadPhialConfigOptions,
  LoadedHornConfig,
  LoadedHornConfig as LoadedPhialConfig,
} from "./lib/vite-plugin/config";
export type {
  HornBuildOptions,
  HornBuildOptions as PhialBuildOptions,
  HornBuildResult,
  HornBuildResult as PhialBuildResult,
  HornPrepareOptions,
  HornPrepareOptions as PhialPrepareOptions,
  HornDevServerHandle,
  HornDevServerHandle as PhialDevServerHandle,
  HornDevServerOptions,
  HornDevServerOptions as PhialDevServerOptions,
  HornStartServerHandle,
  HornStartServerHandle as PhialStartServerHandle,
  HornStartServerOptions,
  HornStartServerOptions as PhialStartServerOptions,
} from "./lib/vite-plugin/host";
