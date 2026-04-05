import { buildServerRouteTree } from "./build-tree";
import { resolveServerRouteRecords } from "./resolve-routes";
import { resolveServerMiddlewareRegistry } from "./resolve-server";
import type { CreateServerRouteModulesOptions, CreateServerRouteModulesResult } from "./types";

export async function createServerRouteModules(
  options: CreateServerRouteModulesOptions,
): Promise<CreateServerRouteModulesResult> {
  const tree = buildServerRouteTree(options.routes);
  const middlewareRegistry = await resolveServerMiddlewareRegistry(
    options.server,
    options.resolveModule,
  );
  const routes = await resolveServerRouteRecords({
    tree,
    resolveModule: options.resolveModule,
    middlewareRegistry,
  });

  return {
    routes,
    middlewareRegistry,
    tree,
  };
}
