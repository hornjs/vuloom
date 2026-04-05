import { buildAppRouteTree } from "./build-tree";
import { resolveAppModule } from "./resolve-app";
import { resolveRouteModules } from "./resolve-routes";
import type { CreateRouteRuntimeModulesOptions, CreateRouteRuntimeModulesResult } from "./types";

export async function createRouteRuntimeModules(
  options: CreateRouteRuntimeModulesOptions,
): Promise<CreateRouteRuntimeModulesResult> {
  const tree = buildAppRouteTree(options.routes);
  const resolvedApp = await resolveAppModule(options.app, options.resolveModule);
  const routes = await resolveRouteModules({
    tree,
    resolveModule: options.resolveModule,
    middlewareRegistry: resolvedApp.middlewareRegistry,
  });

  return {
    app: resolvedApp.app,
    routes,
    tree,
  };
}
