import type { RouteTree, SegmentToken } from "fs-route-ir";

export type AppRouteEntryKind =
  | "layout"
  | "page"
  | "loading"
  | "error"
  | "loader"
  | "action"
  | "middleware"
  | "directory-middleware";

export interface ScannedAppRouteEntry {
  file: string;
}

export interface ScannedAppRoutesInput {
  entries: ScannedAppRouteEntry[];
}

export interface ScannedAppRuntimeInput {
  app?: string;
  error?: string;
  loader?: string;
  config?: string;
  middleware?: Record<string, string>;
}

export interface ModuleResolver {
  resolve(file: string): unknown | Promise<unknown>;
}

export type ComponentLike = unknown;

export interface LoaderContext {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  route: PageRouteRecord;
  matches: PageRouteRecord[];
}

export interface ActionContext extends LoaderContext {
  formData: FormData;
}

export interface MiddlewareContext extends LoaderContext {
  phase: "render" | "action";
}

export type LoaderFunction = (context: LoaderContext) => unknown | Promise<unknown>;
export type ActionFunction = (context: ActionContext) => unknown | Promise<unknown>;
export type PageMiddleware = (
  context: MiddlewareContext,
  next: () => Promise<Response | void>,
) => Response | void | Promise<Response | void>;

export interface BaseShouldRevalidateArgs {
  currentUrl: URL | null;
  nextUrl: URL;
  currentParams: Record<string, string>;
  nextParams: Record<string, string>;
  defaultShouldRevalidate: boolean;
}

export interface NavigationShouldRevalidateArgs extends BaseShouldRevalidateArgs {
  type: "navigation";
}

export interface ActionShouldRevalidateArgs extends BaseShouldRevalidateArgs {
  type: "action";
  formMethod: string;
  formAction: string;
  actionStatus: number;
  actionRouteId: string;
  actionResult?: unknown;
}

export interface AppModule {
  shell?: ComponentLike;
  loader?: (request: Request) => unknown | Promise<unknown>;
  error?: ComponentLike;
  shouldRevalidate?: (args: NavigationShouldRevalidateArgs | ActionShouldRevalidateArgs) => boolean;
}

export interface BasePageRouteModule {
  layout?: ComponentLike;
  loading?: ComponentLike;
  error?: ComponentLike;
  component?: ComponentLike;
  loader?: LoaderFunction;
  middleware?: PageMiddleware[];
  shouldRevalidate?: (args: NavigationShouldRevalidateArgs | ActionShouldRevalidateArgs) => boolean;
}

export interface PageComponentRouteModule extends BasePageRouteModule {
  component?: ComponentLike;
  action?: ActionFunction;
}

export interface PageGroupRouteModule extends BasePageRouteModule {
  component?: never;
  action?: never;
}

export type PageRouteModule = PageComponentRouteModule | PageGroupRouteModule;

export interface PageRouteRecord {
  id: string;
  path?: string;
  name?: string;
  module: PageRouteModule;
  children: PageRouteRecord[];
}

export type MiddlewareReference = string | PageMiddleware;

export interface CreateRouteRuntimeModulesOptions {
  app?: ScannedAppRuntimeInput;
  routes?: ScannedAppRoutesInput;
  resolveModule: ModuleResolver["resolve"];
}

export interface CreateRouteRuntimeModulesResult {
  app?: AppModule;
  routes: PageRouteRecord[];
  tree: RouteTree<unknown, AppRouteEntryKind>;
}

export interface ResolvedAppRuntime {
  app?: AppModule;
  middlewareRegistry: Record<string, PageMiddleware>;
}

export interface LayoutAnchor {
  id: string;
  segments: string[];
  middlewareDepth: number;
}

export interface PendingRouteRecord extends Omit<PageRouteRecord, "children"> {
  parentId?: string;
  index?: boolean;
  children: PageRouteRecord[];
}

export type RouteSegmentToken = SegmentToken;
