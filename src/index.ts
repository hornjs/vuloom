// Phial 主入口（用于命令行和配置文件）
export { name, version } from "../package.json" with { type: "json" };

export { runPhialCli } from "./lib/cli";

// 配置定义
export {
  defineConfig,
  loadPhialConfig,
} from "./lib/config";

// CLI 命令
export {
  buildPhialApp,
  preparePhialApp,
  startPhialDevServer,
  startPhialServer,
} from "./lib/host";

// 配置类型
export type {
  PhialConfig,
  PhialConfigEnv,
  PhialConfigExport,
  PhialDevConfig,
  PhialPluginOptions,
  PhialServerConfig,
  LoadPhialConfigOptions,
  LoadedPhialConfig,
} from "./lib/config";

// CLI 类型
export type {
  PhialBuildOptions,
  PhialBuildResult,
  PhialPrepareOptions,
  PhialDevServerHandle,
  PhialDevServerOptions,
  PhialStartServerHandle,
  PhialStartServerOptions,
} from "./lib/host";
