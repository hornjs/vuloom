declare namespace VuloomGeneratedTypes {
  type PageMiddleware = import("vuepagelet/integration").PageMiddleware;
  type LoaderContext = import("vuepagelet/integration").LoaderContext;
  type ActionContext = import("vuepagelet/integration").ActionContext;
  type ShouldRevalidateArgs = import("vuepagelet/integration").ShouldRevalidateArgs;
  type AppModule = import("vuepagelet/integration").AppModule;
  type CreateRouteRuntimeIntegrationOptions =
    import("vuepagelet/integration").CreateRouteRuntimeIntegrationOptions;
  type RouteRuntimeIntegration = import("vuepagelet/integration").RouteRuntimeIntegration;
  type ServerMiddlewareFunction = import("sevok").ServerMiddlewareFunction;

  interface DevConfig {
    host?: string;
    port?: number;
  }

  interface ServerConfig {
    middleware?: readonly string[];
  }

  interface PluginOptions {
    root?: string;
    appDir?: string;
    extensions?: string[];
    routesDir?: string;
    serverRoutesDir?: string;
    serverMiddlewareDir?: string;
    moduleImportMode?: "dynamic" | "eager";
  }

  interface AppConfig {
    middlewares?: readonly string[];
    dataQueryParam?: string;
    injectClientEntry?: boolean;
    clientEntryPath?: string;
  }

  interface Config {
    root?: string;
    app?: AppConfig;
    server?: ServerConfig;
    dev?: DevConfig;
    vite?: unknown;
    plugin?: PluginOptions;
  }

  interface RouteManifestEntry {
    id: string;
    kind?: "layout" | "page";
    path: string;
    file: string;
    parentId?: string;
    index?: boolean;
  }

  // ServerRouteHandler now aligns with sevok's ServerHandler for full feature support
  type ServerRouteHandler = import("sevok").ServerHandler;
  type ServerMiddleware = import("sevok").ServerMiddleware;
  type ServerMethodHandlers = import("sevok").ServerMethodHandlers;

  // Extend sevok's ServerMethodHandlers to add vuloom-specific fields
  interface ServerRouteDefinition extends ServerMethodHandlers {
    middleware?: readonly import("sevok").ServerMiddleware[];
    meta?: Record<string, unknown>;
    /** Fallback handler when no method-specific handler matches */
    handler?: ServerRouteHandler;
  }

  interface ServerRouteRecord {
    id: string;
    path: string;
    file?: string;
    middleware?: readonly import("sevok").ServerMiddleware[];
    definition: ServerRouteDefinition;
  }
}

declare module "vuloom/generated-routes-manifest" {
  export const manifest: VuloomGeneratedTypes.RouteManifestEntry[];
  export default manifest;
}

declare module "vuloom/generated-routes-modules" {
  export interface VuloomGeneratedRouteModuleExports {
    default?: unknown;
    directoryMiddleware?: VuloomGeneratedTypes.PageMiddleware[];
    loader?: (context: VuloomGeneratedTypes.LoaderContext) => unknown | Promise<unknown>;
    action?: (context: VuloomGeneratedTypes.ActionContext) => unknown | Promise<unknown>;
    middleware?: VuloomGeneratedTypes.PageMiddleware[];
    shouldRevalidate?: (args: VuloomGeneratedTypes.ShouldRevalidateArgs) => boolean;
    meta?: unknown;
    ErrorBoundary?: unknown;
    Loading?: unknown;
    onError?: (error: unknown) => unknown;
  }

  export type VuloomGeneratedRouteModuleImporter = () => Promise<
    VuloomGeneratedRouteModuleExports | undefined
  >;
  export type VuloomGeneratedRouteModules =
    | Record<string, VuloomGeneratedRouteModuleExports | undefined>
    | Record<string, VuloomGeneratedRouteModuleImporter>;

  export const routeFiles: Record<string, string[]>;
  export const routeModules: VuloomGeneratedRouteModules;
  export function loadRouteModule(
    id: string,
  ):
    | VuloomGeneratedRouteModuleExports
    | Promise<VuloomGeneratedRouteModuleExports | undefined>
    | undefined;
  export default routeModules;
}

declare module "vuloom/generated-app-runtime" {
  export const appLoader: VuloomGeneratedTypes.AppModule["loader"];
  export const app: VuloomGeneratedTypes.RouteRuntimeIntegration["app"];
  export const routes: VuloomGeneratedTypes.RouteRuntimeIntegration["routes"];
  export function createIntegration(
    runtimeOptions?: Partial<VuloomGeneratedTypes.CreateRouteRuntimeIntegrationOptions>,
  ): VuloomGeneratedTypes.RouteRuntimeIntegration;
  export const integration: VuloomGeneratedTypes.RouteRuntimeIntegration;
  const runtime: VuloomGeneratedTypes.RouteRuntimeIntegration;
  export default runtime;
}

declare module "vuloom/generated-app-loader" {
  export const appLoader: VuloomGeneratedTypes.AppModule["loader"] | undefined;
  export default appLoader;
}

declare module "vuloom/generated-app-middleware" {
  export const appMiddlewareRegistry: Record<string, VuloomGeneratedTypes.PageMiddleware>;
  export default appMiddlewareRegistry;
}

declare module "vuloom/generated-app-plugin" {
  export interface VuloomCreateAppPluginOptions {
    clientEntryPath?: string;
  }

  export function createAppPlugin(
    options?: VuloomCreateAppPluginOptions,
  ): VuloomGeneratedTypes.ServerMiddlewareFunction;
  export const appPlugin: VuloomGeneratedTypes.ServerMiddlewareFunction;
  export default createAppPlugin;
}

declare module "vuloom/generated-server-routes" {
  export const serverRoutes: VuloomGeneratedTypes.ServerRouteRecord[];
  export const serverMiddlewareRegistry: Record<string, VuloomGeneratedTypes.ServerMiddleware>;
  export default serverRoutes;
}

declare module "vuloom/generated-server-middleware" {
  export const serverMiddlewareRegistry: Record<string, VuloomGeneratedTypes.ServerMiddleware>;
  export default serverMiddlewareRegistry;
}

declare module "vuloom/generated-server-plugin" {
  export function createServerPlugin(): VuloomGeneratedTypes.ServerMiddlewareFunction;
  export const serverPlugin: VuloomGeneratedTypes.ServerMiddlewareFunction;
  export default createServerPlugin;
}

declare module "vuloom/generated-config" {
  export const hasConfig: boolean;
  export const config: VuloomGeneratedTypes.Config;
  export default config;
}
