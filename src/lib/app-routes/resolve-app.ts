import type {
  AppModule,
  ModuleResolver,
  PageMiddleware,
  ResolvedAppRuntime,
  ScannedAppRuntimeInput,
} from "./types";

export async function resolveAppModule(
  input: ScannedAppRuntimeInput | undefined,
  resolveModule: ModuleResolver["resolve"],
): Promise<ResolvedAppRuntime> {
  const middlewareRegistry = await resolveAppMiddlewareRegistry(input?.middleware, resolveModule);
  if (!input) {
    return {
      app: undefined,
      middlewareRegistry,
    };
  }

  const app: AppModule = {};

  if (input.app) {
    app.shell = await resolveComponentExport(input.app, resolveModule);
  }

  if (input.error) {
    app.error = await resolveComponentExport(input.error, resolveModule);
  }

  if (input.loader) {
    app.loader = await resolveNamedHandlerExport(input.loader, "loader", resolveModule);
  }

  return {
    app: Object.keys(app).length > 0 ? app : undefined,
    middlewareRegistry,
  };
}

async function resolveAppMiddlewareRegistry(
  registry: Record<string, string> | undefined,
  resolveModule: ModuleResolver["resolve"],
): Promise<Record<string, PageMiddleware>> {
  if (!registry) {
    return {};
  }

  const entries = await Promise.all(
    Object.entries(registry).map(async ([name, file]) => {
      const middleware = await resolveMiddlewareExport(file, resolveModule);
      return [name, middleware] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function resolveComponentExport(
  file: string,
  resolveModule: ModuleResolver["resolve"],
): Promise<NonNullable<AppModule["shell"]>> {
  const value = extractModuleDefault(await resolveModule(file));
  if (!value) {
    throw new Error(`Module "${file}" must provide a default component export.`);
  }

  return value as NonNullable<AppModule["shell"]>;
}

export async function resolveNamedHandlerExport<TFunction extends (...args: unknown[]) => unknown>(
  file: string,
  exportName: "loader" | "action",
  resolveModule: ModuleResolver["resolve"],
): Promise<TFunction> {
  const module = await resolveModule(file);
  const candidate =
    typeof module === "object" && module && exportName in module
      ? (module as Record<string, unknown>)[exportName]
      : extractModuleDefault(module);

  if (typeof candidate !== "function") {
    throw new Error(`Module "${file}" must export a ${exportName} function.`);
  }

  return candidate as TFunction;
}

export async function resolveMiddlewareExport(
  file: string,
  resolveModule: ModuleResolver["resolve"],
): Promise<PageMiddleware> {
  const module = await resolveModule(file);
  const candidate =
    typeof module === "object" && module && "middleware" in module
      ? (module as Record<string, unknown>).middleware
      : extractModuleDefault(module);

  if (typeof candidate !== "function") {
    throw new Error(`Module "${file}" must export a middleware function.`);
  }

  return candidate as PageMiddleware;
}

function extractModuleDefault(module: unknown): unknown {
  if (typeof module === "object" && module && "default" in module) {
    return (module as Record<string, unknown>).default;
  }

  return module;
}
