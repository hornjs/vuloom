import { InvocationContext, createContextKey } from "@hornjs/fest";
import { describe, expect, test, vi } from "vitest";
import { defineComponent } from "vue";
import {
  createAppRouteServerPlugin,
  createServerRoutesPlugin,
} from "../src/lib/server-plugins/index.ts";

type Middleware = (
  request: Request,
  next: (request: Request) => Promise<Response>,
) => Promise<Response> | Response;

function createMockServer() {
  return {
    options: {
      middleware: [] as Middleware[],
    },
  };
}

async function runMiddlewareStack(
  middleware: Middleware[],
  request: Request,
  terminal: (request: Request) => Promise<Response>,
): Promise<Response> {
  async function dispatch(index: number, currentRequest: Request): Promise<Response> {
    const current = middleware[index];
    if (!current) {
      return terminal(currentRequest);
    }

    return current(currentRequest, (nextRequest) => dispatch(index + 1, nextRequest));
  }

  return dispatch(0, request);
}

describe("server plugins", () => {
  test("server routes plugin wins over app routes when both match", async () => {
    const appHandleRequest = vi.fn(async () => new Response("app"));
    const appIntegration = {
      match: vi.fn(() => ({ route: { id: "page" } })),
      handleRequest: appHandleRequest,
    };
    const serverPlugin = createServerRoutesPlugin({
      routes: [
        {
          id: "api/ping",
          path: "/api/ping",
          definition: {
            GET: async () => ({ source: "server" }),
          },
        },
      ],
      middlewareRegistry: {},
    });
    const appPlugin = createAppRouteServerPlugin({
      routes: [
        {
          id: "page",
          path: "/api/ping",
          module: {},
          children: [],
        },
      ],
      createIntegration: () => appIntegration,
    });
    const server = createMockServer();

    appPlugin(server as never);
    serverPlugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/api/ping"),
      async () => new Response("fallback"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: "server" });
    expect(appHandleRequest).not.toHaveBeenCalled();
  });

  test("app routes plugin falls through when no route matches", async () => {
    const handleRequest = vi.fn(async () => new Response("matched"));
    const integration = {
      match: vi.fn(() => null),
      handleRequest,
    };
    const plugin = createAppRouteServerPlugin({
      routes: [],
      createIntegration: () => integration,
    });
    const server = createMockServer();

    plugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/missing"),
      async () => new Response("next"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("next");
    expect(handleRequest).not.toHaveBeenCalled();
  });

  test("app routes plugin calls integration.handleRequest when matched", async () => {
    const handleRequest = vi.fn(async () => new Response("app"));
    const integration = {
      match: vi.fn(() => ({ route: { id: "page" } })),
      handleRequest,
    };
    const plugin = createAppRouteServerPlugin({
      routes: [],
      createIntegration: () => integration,
    });
    const server = createMockServer();

    plugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/page"),
      async () => new Response("next"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("app");
    expect(handleRequest).toHaveBeenCalledTimes(1);
  });

  test("server routes plugin returns 405 when the method is unsupported", async () => {
    const plugin = createServerRoutesPlugin({
      routes: [
        {
          id: "api/ping",
          path: "/api/ping",
          definition: {
            GET: async () => ({ source: "server" }),
          },
        },
      ],
      middlewareRegistry: {},
    });
    const server = createMockServer();

    plugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/api/ping", { method: "POST" }),
      async () => new Response("next"),
    );

    expect(response.status).toBe(405);
  });

  test("server routes plugin matches parameterized paths", async () => {
    const plugin = createServerRoutesPlugin({
      routes: [
        {
          id: "posts/[id]",
          path: "/posts/:id",
          definition: {
            GET: async (request) => ({
              pathname: new URL(request.url).pathname,
            }),
          },
        },
      ],
      middlewareRegistry: {},
    });
    const server = createMockServer();

    plugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/posts/123"),
      async () => new Response("next"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      pathname: "/posts/123",
    });
  });

  test("server routes plugin runs global, directory, and route middleware in order", async () => {
    const traceKey = createContextKey<string[]>([]);
    const globalTrace: Middleware = async (request, next) => {
      const trace = request.context.get(traceKey);
      request.context.set(traceKey, [...trace, "global"]);
      return next(request);
    };
    const directoryTrace: Middleware = async (request, next) => {
      const trace = request.context.get(traceKey);
      request.context.set(traceKey, [...trace, "directory"]);
      return next(request);
    };
    const routeTrace: Middleware = async (request, next) => {
      const trace = request.context.get(traceKey);
      request.context.set(traceKey, [...trace, "route"]);
      return next(request);
    };
    const plugin = createServerRoutesPlugin({
      routes: [
        {
          id: "api/ping",
          path: "/api/ping",
          directoryMiddlewareNames: ["directory-trace"],
          definition: {
            middlewareNames: ["route-trace"],
            GET: async (request) => ({
              trace: request.context.get(traceKey),
            }),
          },
        },
      ],
      middlewareRegistry: {
        "directory-trace": directoryTrace,
        "route-trace": routeTrace,
        "server-trace": globalTrace,
      },
      globalMiddlewareNames: ["server-trace"],
    });
    const server = createMockServer();

    plugin(server as never);
    const request = Object.assign(new Request("http://local/api/ping"), {
      context: new InvocationContext(),
    });

    const response = await runMiddlewareStack(
      server.options.middleware,
      request as never,
      async () => new Response("next"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      trace: ["global", "directory", "route"],
    });
  });

  test("app routes plugin can use the default runtime integration", async () => {
    const plugin = createAppRouteServerPlugin({
      routes: [
        {
          id: "root",
          path: "/",
          module: {
            component: defineComponent({
              name: "RootPage",
              setup() {
                return () => null;
              },
            }),
          },
          children: [],
        },
      ],
    });
    const server = createMockServer();

    plugin(server as never);

    const response = await runMiddlewareStack(
      server.options.middleware,
      new Request("http://local/"),
      async () => new Response("next"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });
});
