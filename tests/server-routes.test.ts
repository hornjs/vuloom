import { describe, expect, test } from "vitest";
import {
  createServerRouteModules,
  type ModuleResolver,
  type ScannedServerRoutesInput,
  type ScannedServerRuntimeInput,
} from "../src/lib/server-routes/index.ts";

function createModuleResolver(modules: Record<string, unknown>): ModuleResolver {
  return {
    resolve(file) {
      if (!(file in modules)) {
        throw new Error(`Unknown module "${file}".`);
      }

      return modules[file];
    },
  };
}

describe("createServerRouteModules", () => {
  test("builds server route records and middleware registry from scanned inputs", async () => {
    const globalMiddleware = async (
      request: Request,
      next: (request: Request) => Promise<Response>,
    ) => next(request);
    const scopeMiddleware = async (
      request: Request,
      next: (request: Request) => Promise<Response>,
    ) => next(request);
    const getHandler = async () => ({ ok: true });
    const postHandler = async () => ({ created: true });
    const robotsHandler = () => new Response("ok");

    const server: ScannedServerRuntimeInput = {
      middleware: {
        "server-trace": "middleware/server-trace.ts",
        "server-trace-scope": "middleware/server-trace-scope.ts",
      },
    };
    const routes: ScannedServerRoutesInput = {
      entries: [{ file: "api/_middleware.ts" }, { file: "api/ping.ts" }, { file: "robots.txt.ts" }],
    };
    const resolver = createModuleResolver({
      "middleware/server-trace.ts": { default: globalMiddleware },
      "middleware/server-trace-scope.ts": { default: scopeMiddleware },
      "api/_middleware.ts": { default: ["server-trace-scope"] },
      "api/ping.ts": {
        default: {
          middleware: ["server-trace"],
          meta: {
            kind: "api",
          },
          GET: getHandler,
          POST: postHandler,
        },
      },
      "robots.txt.ts": {
        route: {
          GET: robotsHandler,
        },
      },
    });

    const result = await createServerRouteModules({
      server,
      routes,
      resolveModule: resolver.resolve,
    });

    expect(result.tree.profile).toBe("file-based");
    expect(result.middlewareRegistry).toEqual({
      "server-trace": globalMiddleware,
      "server-trace-scope": scopeMiddleware,
    });
    expect(result.routes).toHaveLength(2);

    expect(result.routes[0]).toMatchObject({
      id: "api/ping",
      path: "/api/ping",
      file: "api/ping.ts",
      directoryMiddlewareNames: ["server-trace-scope"],
      definition: {
        middlewareNames: ["server-trace"],
        meta: {
          kind: "api",
        },
      },
    });
    expect(result.routes[0]?.definition.GET).toBe(getHandler);
    expect(result.routes[0]?.definition.POST).toBe(postHandler);

    expect(result.routes[1]).toMatchObject({
      id: "robots.txt",
      path: "/robots.txt",
      file: "robots.txt.ts",
      directoryMiddlewareNames: [],
      definition: {},
    });
    expect(result.routes[1]?.definition.GET).toBe(robotsHandler);
  });

  test("rejects invalid server route modules", async () => {
    const routes: ScannedServerRoutesInput = {
      entries: [{ file: "api/ping.ts" }],
    };

    await expect(
      createServerRouteModules({
        routes,
        resolveModule: createModuleResolver({
          "api/ping.ts": {
            default: "not-a-route",
          },
        }).resolve,
      }),
    ).rejects.toThrow(
      'Invalid server route module "api/ping.ts". Expected a default export or named "route" export.',
    );
  });

  test("rejects invalid server route directory middleware exports", async () => {
    const routes: ScannedServerRoutesInput = {
      entries: [{ file: "api/_middleware.ts" }, { file: "api/ping.ts" }],
    };

    await expect(
      createServerRouteModules({
        routes,
        resolveModule: createModuleResolver({
          "api/_middleware.ts": {
            default: "server-trace-scope",
          },
          "api/ping.ts": {
            default: {
              GET: async () => ({ ok: true }),
            },
          },
        }).resolve,
      }),
    ).rejects.toThrow(
      'Invalid server route directory middleware "api/_middleware.ts". Expected a default export or named "middleware" export with a string array.',
    );
  });

  test("wraps ambiguous server route signatures with a horn-level error", async () => {
    const routes: ScannedServerRoutesInput = {
      entries: [{ file: "users/[id].ts" }, { file: "users/[slug].ts" }],
    };

    await expect(
      createServerRouteModules({
        routes,
        resolveModule: createModuleResolver({
          "users/[id].ts": {
            default: {
              GET: async () => ({ ok: true }),
            },
          },
          "users/[slug].ts": {
            default: {
              GET: async () => ({ ok: true }),
            },
          },
        }).resolve,
      }),
    ).rejects.toThrow(/Ambiguous server routes/);
  });
});
