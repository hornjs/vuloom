import type { RouteTree } from "fs-route-ir";
import type { ModuleResolver } from "../app-routes/types";
export type { ModuleResolver };
import type { ServerHandler, ServerMethodHandlers, ServerMiddleware } from "sevok";

export type ServerRouteEntryKind = "route" | "middleware";

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

// Extend sevok's ServerMethodHandlers to add vuloom-specific fields
export interface ServerRouteDefinition extends ServerMethodHandlers {
  middleware?: readonly ServerMiddleware[];
  meta?: Record<string, unknown>;
}

export interface ServerRouteRecord {
  id: string;
  path: string;
  file?: string;
  middleware?: readonly ServerMiddleware[];
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
