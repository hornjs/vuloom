// Vuloom 主入口（用于命令行和配置文件）
export { name, version } from "../package.json" with { type: "json" };

export { runVuloomCli } from "./lib/cli";

// 配置定义
export {
  defineConfig,
  loadVuloomConfig,
} from "./lib/config";

// CLI 命令
export {
  buildVuloomApp,
  prepareVuloomApp,
  startVuloomDevServer,
  startVuloomServer,
} from "./lib/host";

// 配置类型
export type {
  VuloomConfig,
  VuloomConfigEnv,
  VuloomConfigExport,
  VuloomDevConfig,
  VuloomPluginOptions,
  VuloomServerConfig,
  LoadVuloomConfigOptions,
  LoadedVuloomConfig,
} from "./lib/config";

// CLI 类型
export type {
  VuloomBuildOptions,
  VuloomBuildResult,
  VuloomPrepareOptions,
  VuloomDevServerHandle,
  VuloomDevServerOptions,
  VuloomStartServerHandle,
  VuloomStartServerOptions,
} from "./lib/host";
