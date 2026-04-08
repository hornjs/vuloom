declare namespace PhialGeneratedTypes {
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

  // Extend sevok's ServerMethodHandlers to add phial-specific fields
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

declare module "phial/generated-routes-manifest" {
  export const manifest: PhialGeneratedTypes.RouteManifestEntry[];
  export default manifest;
}

declare module "phial/generated-routes-modules" {
  export interface PhialGeneratedRouteModuleExports {
    default?: unknown;
    directoryMiddleware?: PhialGeneratedTypes.PageMiddleware[];
    loader?: (context: PhialGeneratedTypes.LoaderContext) => unknown | Promise<unknown>;
    action?: (context: PhialGeneratedTypes.ActionContext) => unknown | Promise<unknown>;
    middleware?: PhialGeneratedTypes.PageMiddleware[];
    shouldRevalidate?: (args: PhialGeneratedTypes.ShouldRevalidateArgs) => boolean;
    meta?: unknown;
    ErrorBoundary?: unknown;
    Loading?: unknown;
    onError?: (error: unknown) => unknown;
  }

  export type PhialGeneratedRouteModuleImporter = () => Promise<
    PhialGeneratedRouteModuleExports | undefined
  >;
  export type PhialGeneratedRouteModules =
    | Record<string, PhialGeneratedRouteModuleExports | undefined>
    | Record<string, PhialGeneratedRouteModuleImporter>;

  export const routeFiles: Record<string, string[]>;
  export const routeModules: PhialGeneratedRouteModules;
  export function loadRouteModule(
    id: string,
  ):
    | PhialGeneratedRouteModuleExports
    | Promise<PhialGeneratedRouteModuleExports | undefined>
    | undefined;
  export default routeModules;
}

declare module "phial/generated-app-runtime" {
  export const appLoader: PhialGeneratedTypes.AppModule["loader"];
  export const app: PhialGeneratedTypes.RouteRuntimeIntegration["app"];
  export const routes: PhialGeneratedTypes.RouteRuntimeIntegration["routes"];
  export function createIntegration(
    runtimeOptions?: Partial<PhialGeneratedTypes.CreateRouteRuntimeIntegrationOptions>,
  ): PhialGeneratedTypes.RouteRuntimeIntegration;
  export const integration: PhialGeneratedTypes.RouteRuntimeIntegration;
  const runtime: PhialGeneratedTypes.RouteRuntimeIntegration;
  export default runtime;
}

declare module "phial/generated-app-loader" {
  export const appLoader: PhialGeneratedTypes.AppModule["loader"] | undefined;
  export default appLoader;
}

declare module "phial/generated-app-middleware" {
  export const appMiddlewareRegistry: Record<string, PhialGeneratedTypes.PageMiddleware>;
  export default appMiddlewareRegistry;
}

declare module "phial/generated-app-plugin" {
  export interface PhialCreateAppPluginOptions {
    clientEntryPath?: string;
  }

  export function createAppPlugin(
    options?: PhialCreateAppPluginOptions,
  ): PhialGeneratedTypes.ServerMiddlewareFunction;
  export const appPlugin: PhialGeneratedTypes.ServerMiddlewareFunction;
  export default createAppPlugin;
}

declare module "phial/generated-server-routes" {
  export const serverRoutes: PhialGeneratedTypes.ServerRouteRecord[];
  export const serverMiddlewareRegistry: Record<string, PhialGeneratedTypes.ServerMiddleware>;
  export default serverRoutes;
}

declare module "phial/generated-server-middleware" {
  export const serverMiddlewareRegistry: Record<string, PhialGeneratedTypes.ServerMiddleware>;
  export default serverMiddlewareRegistry;
}

declare module "phial/generated-server-plugin" {
  export function createServerPlugin(): PhialGeneratedTypes.ServerMiddlewareFunction;
  export const serverPlugin: PhialGeneratedTypes.ServerMiddlewareFunction;
  export default createServerPlugin;
}

declare module "phial/generated-config" {
  export const hasConfig: boolean;
  export const config: PhialGeneratedTypes.Config;
  export default config;
}
