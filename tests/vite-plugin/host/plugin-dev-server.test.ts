import { describe, expect, test, vi } from "vitest";
import {
  createAppRouteServerPlugin,
} from "../../../src/lib/app-routes/index.ts";
import {
  createPhialViteInlineConfig,
  createDevRequestHandler,
  resolveDevServerUrl,
} from "../../../src/lib/vite-plugin/host/plugin-dev-server.ts";

describe("plugin dev server", () => {
  test("creates a sevok request handler from generated server/app plugins", async () => {
    const ssrLoadModule = vi.fn(async (id: string) => {
      if (id === "phial/generated-server-plugin") {
        // New server plugin is a sevok plugin function that applies routes directly
        return {
          default: () => (server: { options: { routes?: Record<string, unknown>; middleware?: unknown[] } }) => {
            server.options.routes = {
              ...server.options.routes,
              "/api/ping": {
                GET: async () => new Response("pong"),
              },
            };
          },
        };
      }

      if (id === "phial/generated-app-plugin") {
        return {
          default: () =>
            createAppRouteServerPlugin({
              routes: [],
              createIntegration: () => ({
                match: (pathname: string) => (pathname === "/" ? { route: { id: "page" } } : null),
                handleRequest: async () => new Response("page html", { status: 200 }),
              }),
            }),
        };
      }

      throw new Error(`Unexpected module id: ${id}`);
    });
    const handler = await createDevRequestHandler({
      ssrLoadModule,
    } as never);

    const serverResponse = await handler.fetch(new Request("http://local/api/ping"));
    expect(serverResponse.status).toBe(200);
    expect(await serverResponse.text()).toBe("pong");

    const appResponse = await handler.fetch(new Request("http://local/"));
    expect(appResponse.status).toBe(200);
    expect(await appResponse.text()).toBe("page html");

    const missingResponse = await handler.fetch(new Request("http://local/missing"));
    expect(missingResponse.status).toBe(404);

    expect(ssrLoadModule).toHaveBeenNthCalledWith(1, "phial/generated-app-plugin");
    expect(ssrLoadModule).toHaveBeenNthCalledWith(2, "phial/generated-server-plugin");
  });

  test("resolves the public dev url from the bound server address", () => {
    const url = resolveDevServerUrl(
      {
        address() {
          return {
            port: 4173,
          };
        },
      } as never,
      "127.0.0.1",
      0,
    );

    expect(url).toBe("http://127.0.0.1:4173");
  });

  test("binds vite hmr to the current dev http server", () => {
    const hmrServer = {} as never;
    const config = createPhialViteInlineConfig({}, "/project", undefined, hmrServer);

    expect(config.server?.middlewareMode).toBe(true);
    expect(config.server?.hmr).toMatchObject({
      server: hmrServer,
    });
  });
});
