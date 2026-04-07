// Core route building and resolution
export { buildAppRouteTree } from "./build-tree";
export { createRouteRuntimeModules } from "./create-route-runtime-modules";
export { resolveAppModule } from "./resolve-app";
export { resolveRouteModules } from "./resolve-routes";

// Server middleware for app routes
export { createAppRouteMiddleware } from "./app-routes-middleware";

// Local types
export type * from "./types";
export type { CreateAppRouteMiddlewareOptions } from "./app-routes-middleware";

// Re-export vuepagelet types for consumers
// These are the core types needed when working with app routes
export type {
  // Route types
  PageRouteRecord,
  PageRouteModule,
  PageComponentRouteModule,
  PageGroupRouteModule,
  // Context types for loaders/actions/middleware
  LoaderContext,
  ActionContext,
  MiddlewareContext,
  // Handler types
  PageMiddleware,
  LoaderResult,
  ActionResult,
  // App types
  AppModule,
  // Integration
  RouteRuntimeIntegration,
  CreateRouteRuntimeIntegrationOptions,
  // Router
  PageRouter,
  CreatePageRouterOptions,
  RouteResolver,
  PageRouteMatch,
  // SSR/Request
  PageRequestHandlerOptions,
  StreamRenderOptions,
  InitialPayload,
  // Navigation
  PageRouteLocation,
  ResolvedNavigationLocation,
  // Deferred data
  DeferredDataRecord,
  defer,
  // State
  PageRuntimeState,
  NavigationState,
  TransitionSnapshot,
  // Renderer
  renderPageResponse,
  // Hydration
  hydratePage,
} from "vuepagelet/integration";
