import type { RouteTree, SegmentToken } from "fs-route-ir";
import type {
  PageRouteRecord as VuePageletPageRouteRecord,
  PageRouteModule as VuePageletPageRouteModule,
  PageComponentRouteModule as VuePageletPageComponentRouteModule,
  PageGroupRouteModule as VuePageletPageGroupRouteModule,
  AppModule as VuePageletAppModule,
  LoaderContext as VuePageletLoaderContext,
  ActionContext as VuePageletActionContext,
  MiddlewareContext as VuePageletMiddlewareContext,
  PageMiddleware as VuePageletPageMiddleware,
  LoaderResult,
  ActionResult,
  ShouldRevalidateArgs,
  PageMiddleware,
} from "vuepagelet/integration";

/**
 * App route entry kinds supported by phial's file-system routing.
 * These map to vuepagelet's route module structure.
 */
export type AppRouteEntryKind =
  | "layout"
  | "page"
  | "loading"
  | "error"
  | "loader"
  | "action"
  | "middleware"
  | "directory-middleware";

/**
 * Input from the scanner for app routes.
 */
export interface ScannedAppRouteEntry {
  file: string;
}

export interface ScannedAppRoutesInput {
  entries: ScannedAppRouteEntry[];
}

/**
 * Input from the scanner for app-level runtime files.
 */
export interface ScannedAppRuntimeInput {
  app?: string;
  error?: string;
  loader?: string;
  config?: string;
  middleware?: Record<string, string>;
}

/**
 * Module resolver for loading route files.
 */
export interface ModuleResolver {
  resolve(file: string): unknown | Promise<unknown>;
}

/**
 * Component-like type for route components.
 * Vue components are the primary use case.
 */
export type ComponentLike = NonNullable<VuePageletAppModule["shell"]>;

// Re-export core types from vuepagelet for seamless integration
export type {
  VuePageletLoaderContext as LoaderContext,
  VuePageletActionContext as ActionContext,
  VuePageletMiddlewareContext as MiddlewareContext,
  VuePageletPageMiddleware as PageMiddleware,
  LoaderResult,
  ActionResult,
  ShouldRevalidateArgs,
};

/**
 * Navigation-specific shouldRevalidate args.
 */
export type NavigationShouldRevalidateArgs = Extract<ShouldRevalidateArgs, { type: "navigation" }>;

/**
 * Action-specific shouldRevalidate args.
 */
export type ActionShouldRevalidateArgs = Extract<ShouldRevalidateArgs, { type: "action" }>;

/**
 * App module configuration - aligned with vuepagelet's AppModule.
 * Provides shell layout, global error boundary, app-level loader, and shouldRevalidate.
 */
export interface AppModule extends VuePageletAppModule {}

/**
 * Base route module properties shared between layout and page routes.
 * Maps directly to vuepagelet's BasePageRouteModule.
 */
export type BasePageRouteModule = Omit<VuePageletPageRouteModule, "action">;

/**
 * Route module for page components with optional action handler.
 * Maps directly to vuepagelet's PageComponentRouteModule.
 */
export interface PageComponentRouteModule extends VuePageletPageComponentRouteModule {}

/**
 * Route module for layout-only routes (groups).
 * Maps directly to vuepagelet's PageGroupRouteModule.
 */
export interface PageGroupRouteModule extends VuePageletPageGroupRouteModule {}

/**
 * Route module union type.
 */
export type PageRouteModule = VuePageletPageRouteModule;

/**
 * Route record representing a page or layout route.
 * Maps directly to vuepagelet's PageRouteRecord.
 */
export type PageRouteRecord = VuePageletPageRouteRecord;

/**
 * Middleware reference - can be a registered name or direct function.
 */
export type MiddlewareReference = string | PageMiddleware;

/**
 * Options for creating route runtime modules.
 */
export interface CreateRouteRuntimeModulesOptions {
  app?: ScannedAppRuntimeInput;
  routes?: ScannedAppRoutesInput;
  resolveModule: ModuleResolver["resolve"];
}

/**
 * Result of creating route runtime modules.
 */
export interface CreateRouteRuntimeModulesResult {
  app?: AppModule;
  routes: PageRouteRecord[];
  tree: RouteTree<unknown, AppRouteEntryKind>;
}

/**
 * Resolved app runtime with middleware registry.
 */
export interface ResolvedAppRuntime {
  app?: AppModule;
  middlewareRegistry: Record<string, PageMiddleware>;
}

/**
 * Internal layout anchor tracking for route tree building.
 */
export interface LayoutAnchor {
  id: string;
  segments: string[];
  middlewareDepth: number;
}

/**
 * Internal pending route record before nesting.
 */
export interface PendingRouteRecord extends Omit<PageRouteRecord, "children"> {
  parentId?: string;
  index?: boolean;
  children: PageRouteRecord[];
}

/**
 * Route segment token alias.
 */
export type RouteSegmentToken = SegmentToken;
