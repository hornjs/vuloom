import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ResolvedConfig, Plugin } from "vite";
import {
  DEFAULT_PHIAL_CONFIG_FILES,
  isPhialConfigFile,
  loadPhialConfig,
} from "../../src/lib/config/index.ts";
import {
  GENERATED_APP_PLUGIN_ID,
  GENERATED_SERVER_PLUGIN_ID,
  resolveVirtualModuleId,
} from "../../src/lib/vite/generated/virtual-modules.ts";
import { phialVitePlugin } from "../../src/vite.ts";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "phial-vite-plugin-"));
  tempRoots.push(root);
  return root;
}

async function callResolveId(
  plugin: Plugin,
  source: string,
): Promise<string | null | undefined> {
  const handler = plugin.resolveId;
  if (typeof handler === "function") {
    return handler.call({} as never, source, undefined, { isEntry: false }) as Promise<string | null | undefined>;
  }
  if (handler?.handler) {
    return handler.handler.call({} as never, source, undefined, { isEntry: false }) as Promise<string | null | undefined>;
  }
  return undefined;
}

async function callLoad(plugin: Plugin, id: string): Promise<string | null | undefined> {
  const handler = plugin.load;
  if (typeof handler === "function") {
    return handler.call({} as never, id) as Promise<string | null | undefined>;
  }
  if (handler?.handler) {
    return handler.handler.call({} as never, id) as Promise<string | null | undefined>;
  }
  return undefined;
}

async function writeFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("phialVitePlugin", () => {
  test("prefers phial config files and ignores horn config filenames", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "phial.config.ts": "export default {}",
    });

    expect(DEFAULT_PHIAL_CONFIG_FILES).toEqual([
      "phial.config.ts",
      "phial.config.mts",
      "phial.config.js",
      "phial.config.mjs",
      "phial.config.cts",
      "phial.config.cjs",
    ]);
    expect(isPhialConfigFile("phial.config.ts")).toBe(true);
    expect(isPhialConfigFile("/tmp/phial.config.ts")).toBe(true);
    expect(isPhialConfigFile("horn.config.ts")).toBe(false);

    const loaded = await loadPhialConfig({ root });

    expect(loaded.file).toContain("phial.config.ts");
    expect(loaded.file).not.toContain("horn.config.ts");
  });

  test("loads generated app/server plugin virtual modules", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/app.vue": "<template><div /></template>",
      "app/pages/layout.vue": "<template><div><slot /></div></template>",
      "app/pages/page.vue": "<template><div>home</div></template>",
      "server/routes/ping.ts": "export default { GET() { return new Response('pong') } }",
    });

    const plugin = phialVitePlugin({
      root,
      extensions: [".vue", ".ts"],
    });

    const configResolved = plugin.configResolved;
    if (typeof configResolved === "function") {
      configResolved.call({} as never, {
        root,
        command: "serve",
        mode: "development",
        logLevel: "info",
        build: {
          ssr: false,
        },
      } as ResolvedConfig);
    } else if (configResolved?.handler) {
      configResolved.handler.call({} as never, {
        root,
        command: "serve",
        mode: "development",
        logLevel: "info",
        build: {
          ssr: false,
        },
      } as ResolvedConfig);
    }

    const appPluginId = await callResolveId(plugin, GENERATED_APP_PLUGIN_ID);
    const serverPluginId = await callResolveId(plugin, GENERATED_SERVER_PLUGIN_ID);

    expect(appPluginId).toBe(`\0${GENERATED_APP_PLUGIN_ID}`);
    expect(serverPluginId).toBe(`\0${GENERATED_SERVER_PLUGIN_ID}`);
    expect(resolveVirtualModuleId("phial/generated-app-plugin")).toBe(
      "\0phial/generated-app-plugin",
    );
    expect(resolveVirtualModuleId("phial/generated-server-plugin")).toBe(
      "\0phial/generated-server-plugin",
    );

    const appPluginModule = await callLoad(plugin, appPluginId as string);
    const serverPluginModule = await callLoad(plugin, serverPluginId as string);

    expect(appPluginModule).toContain("createAppRouteMiddleware");
    expect(appPluginModule).toContain("export default createAppPlugin");
    expect(serverPluginModule).toContain("createServerPlugin");
    expect(serverPluginModule).toContain("return async (context, next) => {");
    expect(serverPluginModule).toContain("const request = context.request");
    expect(serverPluginModule).toContain("return next(context)");
    expect(serverPluginModule).toContain("export default createServerPlugin");
  });

  test("does not invalidate generated virtual modules for route file content changes", async () => {
    const root = await createTempRoot();
    await writeFiles(root, {
      "app/app.vue": "<template><div /></template>",
      "app/pages/layout.vue": "<template><div><slot /></div></template>",
      "app/pages/page.ts":
        "import { defineComponent, h } from 'vue'; export default defineComponent({ setup(){ return () => h('div', null, 'home') } });",
    });

    const plugin = phialVitePlugin({
      root,
      extensions: [".vue", ".ts"],
    });
    const events = new Map<string, Array<(file: string) => void>>();
    const invalidateModule = vi.fn();
    const send = vi.fn();

    const configResolved2 = plugin.configResolved;
    if (typeof configResolved2 === "function") {
      configResolved2.call({} as never, {
        root,
        command: "serve",
        mode: "development",
        logLevel: "info",
        build: {
          ssr: false,
        },
      } as ResolvedConfig);
    } else if (configResolved2?.handler) {
      configResolved2.handler.call({} as never, {
        root,
        command: "serve",
        mode: "development",
        logLevel: "info",
        build: {
          ssr: false,
        },
      } as ResolvedConfig);
    }

    const configureServer = plugin.configureServer;
    if (typeof configureServer === "function") {
      configureServer.call({} as never, {
        watcher: {
          on(event: string, handler: (file: string) => void) {
            const handlers = events.get(event) ?? [];
            handlers.push(handler);
            events.set(event, handlers);
            return this;
          },
        },
        moduleGraph: {
          getModuleById(id: string) {
            return { id };
          },
          invalidateModule,
        },
        environments: {
          client: {
            hot: {
              send,
            },
          },
        },
        ws: {
          send,
        },
        middlewares: {
          use() {},
        },
      } as never);
    } else if (configureServer?.handler) {
      configureServer.handler.call({} as never, {
        watcher: {
          on(event: string, handler: (file: string) => void) {
            const handlers = events.get(event) ?? [];
            handlers.push(handler);
            events.set(event, handlers);
            return this;
          },
        },
        moduleGraph: {
          getModuleById(id: string) {
            return { id };
          },
          invalidateModule,
        },
        environments: {
          client: {
            hot: {
              send,
            },
          },
        },
        ws: {
          send,
        },
        middlewares: {
          use() {},
        },
      } as never);
    }

    for (const handler of events.get("ready") ?? []) {
      handler(root);
    }
    for (const handler of events.get("change") ?? []) {
      handler(join(root, "app/pages/page.ts"));
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(invalidateModule).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
