import type { RouteTree } from "fs-route-ir";
import type { ModuleResolver } from "../app-routes/types";

export type ServerRouteEntryKind = "route" | "directory-middleware";

export interface ScannedServerRouteEntry {
  file: string;
}

export interface ScannedServerRoutesInput {
  entries: ScannedServerRouteEntry[];
}

export interface ScannedServerRuntimeInput {
  middleware?: Record<string, string>;
}

export type ServerRouteHandler = (request: Request) => unknown | Promise<unknown>;
export type ServerMiddleware = (
  request: Request,
  next: (request: Request) => Promise<Response>,
) => Response | Promise<Response>;

export interface ServerRouteDefinition {
  middlewareNames?: readonly string[];
  meta?: Record<string, unknown>;
  handler?: ServerRouteHandler;
  GET?: ServerRouteHandler;
  POST?: ServerRouteHandler;
  PUT?: ServerRouteHandler;
  PATCH?: ServerRouteHandler;
  DELETE?: ServerRouteHandler;
  HEAD?: ServerRouteHandler;
  OPTIONS?: ServerRouteHandler;
}

export interface ServerRouteRecord {
  id: string;
  path: string;
  file?: string;
  directoryMiddlewareNames?: readonly string[];
  definition: ServerRouteDefinition;
}

export interface CreateServerRouteModulesOptions {
  server?: ScannedServerRuntimeInput;
  routes?: ScannedServerRoutesInput;
  resolveModule: ModuleResolver["resolve"];
}

export interface CreateServerRouteModulesResult {
  routes: ServerRouteRecord[];
  middlewareRegistry: Record<string, ServerMiddleware>;
  tree: RouteTree<unknown, ServerRouteEntryKind>;
}
