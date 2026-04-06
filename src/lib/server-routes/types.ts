import type { RouteTree } from "fs-route-ir";
import type { ModuleResolver } from "../app-routes/types";
export type { ModuleResolver };
import type { ServerHandler, ServerMethodHandlers, ServerMiddleware } from "sevok";

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

// ServerRouteHandler now aligns with sevok's ServerHandler for full feature support
export type ServerRouteHandler = ServerHandler;
export type { ServerMiddleware, ServerMethodHandlers };

// Extend sevok's ServerMethodHandlers to add phial-specific fields
export interface ServerRouteDefinition extends ServerMethodHandlers {
  middlewareNames?: readonly string[];
  meta?: Record<string, unknown>;
  /** Fallback handler when no method-specific handler matches */
  handler?: ServerHandler;
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
